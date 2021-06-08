// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2020 ZeroEx Intl.

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

import "@0x/contracts-zero-ex/contracts/src/transformers/bridges/mixins/MixinMooniswap.sol";
import "./SwapRevertSampler.sol";

interface IMooniswapRegistry {
    function pools(address token1, address token2) external view returns(address);
}

contract MooniswapSampler is
    MixinMooniswap,
    SwapRevertSampler
{

    constructor(IEtherTokenV06 weth)
        public
        MixinMooniswap(weth)
    { }

    function sampleSwapFromMooniswap(
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 takerTokenAmount
    )
        external
        returns (uint256)
    {
        return _tradeMooniswapInternal(
            IEtherTokenV06(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2),
            IERC20TokenV06(sellToken),
            IERC20TokenV06(buyToken),
            takerTokenAmount,
            bridgeData
        );
    }

    /// @dev Sample sell quotes from Mooniswap.
    /// @param registry Address of the Mooniswap Registry.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return pool The contract address for the pool
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromMooniswap(
        address registry,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (address pool, uint256[] memory makerTokenAmounts)
    {
        uint256[] memory gasUsed;
        pool = IMooniswapRegistry(registry).pools(takerToken, makerToken);
        (gasUsed, makerTokenAmounts) = _sampleSwapQuotesRevert(
            SwapRevertSamplerQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                bridgeData: abi.encode(pool),
                getSwapQuoteCallback: this.sampleSwapFromMooniswap
            }),
            takerTokenAmounts
        );
    }

    /// @dev Sample buy quotes from Mooniswap.
    /// @param registry Address of the Mooniswap Registry.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token sell amount for each sample.
    /// @return pool The contract address for the pool
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromMooniswap(
        address registry,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (address pool, uint256[] memory takerTokenAmounts)
    {
        uint256[] memory gasUsed;
        pool = IMooniswapRegistry(registry).pools(takerToken, makerToken);
        (gasUsed, takerTokenAmounts) = _sampleSwapApproximateBuys(
            SwapRevertSamplerBuyQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                sellTokenData: abi.encode(pool),
                buyTokenData: abi.encode(pool),
                getSwapQuoteCallback: this.sampleSwapFromMooniswap
            }),
            makerTokenAmounts
        );

    }
}
