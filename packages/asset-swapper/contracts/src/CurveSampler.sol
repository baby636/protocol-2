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

import "@0x/contracts-zero-ex/contracts/src/transformers/bridges/mixins/MixinCurve.sol";
import "./SwapRevertSampler.sol";


contract CurveSampler is
    MixinCurve,
    SwapRevertSampler
{
    /// @dev Information for sampling from curve sources.
    struct CurveInfo {
        address poolAddress;
        bytes4 sellQuoteFunctionSelector;
        bytes4 buyQuoteFunctionSelector;
    }

    constructor(IEtherTokenV06 weth)
        public
        MixinCurve(weth)
    { }

    function sampleSwapFromCurve(
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 takerTokenAmount
    )
        external
        returns (uint256)
    {
        return _tradeCurveInternal(
            IEtherTokenV06(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2),
            IERC20TokenV06(sellToken),
            IERC20TokenV06(buyToken),
            takerTokenAmount,
            bridgeData
        );
    }

    /// @dev Sample sell quotes from Curve.
    /// @param curveInfo Curve information specific to this token pair.
    /// @param takerToken The taker token to sell.
    /// @param makerToken The maker token to buy.
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return gasUsed gas consumed in each sample sell
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromCurve(
        CurveBridgeData memory curveInfo,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (uint256[] memory gasUsed, uint256[] memory makerTokenAmounts)
    {
        (gasUsed, makerTokenAmounts) = _sampleSwapQuotesRevert(
            SwapRevertSamplerQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                bridgeData: abi.encode(curveInfo),
                getSwapQuoteCallback: this.sampleSwapFromCurve
            }),
            takerTokenAmounts
        );
    }

    /// @dev Sample buy quotes from Curve.
    /// @param curveInfo Curve information specific to this token pair.
    /// @param takerToken The taker token to sell.
    /// @param makerToken The maker token to buy.
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return gasUsed gas consumed in each sample sell
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromCurve(
        CurveBridgeData memory curveInfo,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (uint256[] memory gasUsed, uint256[] memory takerTokenAmounts)
    {
        (gasUsed, takerTokenAmounts) = _sampleSwapApproximateBuys(
            SwapRevertSamplerBuyQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                sellTokenData: abi.encode(curveInfo),
                buyTokenData: abi.encode(
                    CurveBridgeData({
                        curveAddress: curveInfo.curveAddress,
                        exchangeFunctionSelector: curveInfo.exchangeFunctionSelector,
                        fromCoinIdx: curveInfo.toCoinIdx,
                        toCoinIdx: curveInfo.fromCoinIdx
                    })
                ),
                getSwapQuoteCallback: this.sampleSwapFromCurve
            }),
            makerTokenAmounts
        );
    }
}
