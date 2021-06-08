

// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2021 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "./HackedERC20.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";

contract SwapRevertSampler {
    using LibRichErrorsV06 for bytes;

    // solhint-disable no-empty-blocks
    /// @dev Payable fallback to receive ETH from Kyber/WETH.
    receive ()
        external
        payable
    { }

    struct SwapRevertSamplerQuoteOpts {
        // Address of the token which is being sold
        address sellToken;
        // Address of the token which is wanted
        address buyToken;
        // Data required for the bridge to execute the swap
        bytes bridgeData;
        // Callback to retrieve a swap quote.
        function (address sellToken, address buyToken, bytes memory bridgeData, uint256 sellAmount)
            external
            returns (uint256)
            getSwapQuoteCallback;
    }

    struct SwapRevertSamplerBuyQuoteOpts {
        // Address of the token which is being sold
        address sellToken;
        // Address of the token which is wanted
        address buyToken;
        // Data required for the bridge to execute the SELL_TOKEN->BUY_TOKEN swap
        bytes sellTokenData;
        // Data required for the bridge to execute the BUY_TOKEN->SELL_TOKEN swap
        bytes buyTokenData;
        // Callback to retrieve a swap quote.
        function (address sellToken, address buyToken, bytes memory bridgeData, uint256 sellAmount)
            external
            returns (uint256)
            getSwapQuoteCallback;
    }

    /// @dev  Mints the sell token, then performs the swap, then reverts with the amount out.
    /// The SwapRevertSamplerQuoteOpts has been unrolled here as our ABI encoder cannot support
    /// encoding the function
    function _mintCallRevert(
        bytes4 selector,
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 amountIn
    )
        external
    {
        HackedERC20 hackedSellToken = HackedERC20(payable(sellToken));
        HackedERC20 hackedBuyToken = HackedERC20(payable(buyToken));

        // Mint enough to sell
        try
            hackedSellToken.setBalance(address(this), amountIn)
        { } catch (bytes memory reason) { }

        try
            IEtherTokenV06(payable(sellToken)).deposit{ value: amountIn }()
        { } catch (bytes memory reason) { }

        // Ensure the balance of the buyToken is 0
        try
            hackedBuyToken.setBalance(address(this), 0)
        { } catch (bytes memory reason) { }

        require(hackedSellToken.balanceOf(address(this)) == amountIn, "Failed to mint or deposit sellToken");
        require(hackedBuyToken.balanceOf(address(this)) == 0, "Balance of buyToken must be 0");


        // Burn any excess ETH to avoid balance issues for sources which use ETH directly
        address(0).transfer(address(this).balance);

        // Measure the gas
        uint256 gasUsed = gasleft();
        // Perform the sell
        (bool success, bytes memory data) = address(this).call(
            abi.encodeWithSelector(selector, sellToken, buyToken, bridgeData, amountIn)
        );
        gasUsed = gasUsed - gasleft();

        if (!success) {
            data.rrevert();
        }
        // Revert with the amount bought
        _revertSwapSample(abi.decode(data, (uint256)), gasUsed);
    }

    function _sampleSwapQuotesRevert(
        SwapRevertSamplerQuoteOpts memory opts,
        uint256[] memory amountsIn
    )
        internal
        returns (uint256[] memory gasUsed, uint256[] memory amountsOut)
    {
        amountsOut = new uint256[](amountsIn.length);
        gasUsed = new uint256[](amountsIn.length);

        for (uint256 i = 0; i < amountsIn.length; i++) {
            try
                this._mintCallRevert{gas: 2e6}(
                    opts.getSwapQuoteCallback.selector,
                    opts.sellToken,
                    opts.buyToken,
                    opts.bridgeData,
                    amountsIn[i]
                )
            {
                require(false, "Swap Sample should have reverted");
            } catch (bytes memory reason) {
                // Parse the reverted sample data
                // Flip the second parameter during development to raise the underlying revert
                // if one exists
                (amountsOut[i], gasUsed[i]) = _parseRevertedSwapSample(reason, false);
                // If we detect the amount out is 0 then we return early
                // rather than continue performing excess work
                if (amountsOut[i] == 0) {
                    break;
                }
            }
        }
    }

    function _revertSwapSample(
        uint256 amount,
        uint256 gasUsed
    )
        internal
    {
        // Revert it so there is no state change
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, amount)
            mstore(add(ptr, 32), gasUsed)
            revert(ptr, 64)
        }
    }

    /// @dev Parses the reverted swap sample data. If no amount
    ///      is decoded, 0 is returned.
    /// @param reason the string which contains the possible
    ///               sample amount
    /// @param revertOnError  whether to return 0 or revert if invalid
    /// @return the decoded sample amount or 0
    /// @return the gas used in the sample
    function _parseRevertedSwapSample(
        bytes memory reason,
        bool revertOnError
    )
        internal
        pure
        returns (uint256, uint256)
    {
        if (reason.length != 64) {
            if (revertOnError) {
                reason.rrevert();
            } else {
                return (0,0);
            }
        }
        return abi.decode(reason, (uint256, uint256));
    }

    uint256 private constant ONE_HUNDED_PERCENT_BPS = 1e4;
    /// @dev Maximum approximate (positive) error rate when approximating a buy quote.
    uint256 private constant APPROXIMATE_BUY_TARGET_EPSILON_BPS = 0.0005e4;
    /// @dev Maximum iterations to perform when approximating a buy quote.
    uint256 private constant APPROXIMATE_BUY_MAX_ITERATIONS = 5;

    function _sampleSwapApproximateBuys(
        SwapRevertSamplerBuyQuoteOpts memory opts,
        uint256[] memory makerTokenAmounts
    )
        internal
        returns (uint256[] memory gasUsed, uint256[] memory takerTokenAmounts)
    {
        takerTokenAmounts = new uint256[](makerTokenAmounts.length);
        gasUsed = new uint256[](makerTokenAmounts.length);
        if (makerTokenAmounts.length == 0) {
            return (gasUsed, takerTokenAmounts);
        }

        uint256[] memory sellAmounts = new uint256[](1);
        sellAmounts[0] = makerTokenAmounts[0];

        SwapRevertSamplerQuoteOpts memory sellOpts = SwapRevertSamplerQuoteOpts({
            sellToken: opts.sellToken,
            buyToken: opts.buyToken,
            bridgeData: opts.sellTokenData,
            getSwapQuoteCallback: opts.getSwapQuoteCallback
        });

        SwapRevertSamplerQuoteOpts memory buyOpts = SwapRevertSamplerQuoteOpts({
            sellToken: opts.buyToken,
            buyToken: opts.sellToken,
            bridgeData: opts.buyTokenData,
            getSwapQuoteCallback: opts.getSwapQuoteCallback
        });
        // Inverted, perform a sell of the token the user wants to buy
        (, sellAmounts) = _sampleSwapQuotesRevert(buyOpts, sellAmounts);
        if (sellAmounts[0] == 0) {
            return (gasUsed, takerTokenAmounts);
        }

        uint256[] memory buyAmounts;
        // Sell of the token the user wishes to dispose, see how much we buy
        (, buyAmounts) = _sampleSwapQuotesRevert(sellOpts, sellAmounts);

        if (buyAmounts[0] == 0) {
            return (gasUsed, takerTokenAmounts);
        }

        for (uint256 i = 0; i < makerTokenAmounts.length; i++) {
            uint256[] memory _gasUsed;
            for (uint256 iter = 0; iter < APPROXIMATE_BUY_MAX_ITERATIONS; iter++) {
                // adjustedSellAmount = previousSellAmount * (target/actual) * JUMP_MULTIPLIER
                sellAmounts[0] = _safeGetPartialAmountCeil2(
                    makerTokenAmounts[i],
                    buyAmounts[0],
                    sellAmounts[0]
                );
                if (sellAmounts[0] == 0) {
                    break;
                }
                sellAmounts[0] = _safeGetPartialAmountCeil2(
                    (ONE_HUNDED_PERCENT_BPS + APPROXIMATE_BUY_TARGET_EPSILON_BPS),
                    ONE_HUNDED_PERCENT_BPS,
                    sellAmounts[0]
                );
                if (sellAmounts[0] == 0) {
                    break;
                }
                uint256[] memory _buyAmounts;
                (_gasUsed, _buyAmounts) = _sampleSwapQuotesRevert(sellOpts, sellAmounts);
                if (_buyAmounts[0] == 0) {
                    break;
                }
                // We re-use buyAmount next iteration, only assign if it is
                // non zero
                buyAmounts = _buyAmounts;
                // If we've reached our goal, exit early
                if (buyAmounts[0] >= makerTokenAmounts[i]) {
                    uint256 eps =
                        (buyAmounts[0] - makerTokenAmounts[i]) * ONE_HUNDED_PERCENT_BPS /
                        makerTokenAmounts[i];
                    if (eps <= APPROXIMATE_BUY_TARGET_EPSILON_BPS) {
                        break;
                    }
                }
            }
            gasUsed[i] = _gasUsed[0];
            // We do our best to close in on the requested amount, but we can either over buy or under buy and exit
            // if we hit a max iteration limit
            // We scale the sell amount to get the approximate target
            takerTokenAmounts[i] = _safeGetPartialAmountCeil2(
                makerTokenAmounts[i],
                buyAmounts[0],
                sellAmounts[0]
            );
        }
    }

    function _safeGetPartialAmountCeil2(
        uint256 numerator,
        uint256 denominator,
        uint256 target
    )
        internal
        view
        returns (uint256 partialAmount)
    {
        if (numerator == 0 || target == 0 || denominator == 0) return 0;
        uint256 c = numerator * target;
        if (c / numerator != target) return 0;
        return (c + (denominator - 1)) / denominator;
    }

}