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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";


/// @dev Minimal interface for minting StETH
interface ILido {
      /// @dev Adds eth to the pool
      /// @param _referral optional address for referrals
      /// @return StETH Amount of StETH generated
    function submit(address _referral) external payable returns (uint256 StETH);
}


contract MixinLido {
    using LibERC20TokenV06 for IERC20TokenV06;

    address constant private ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    function _tradeLido(

        ILido lido,
        IEtherTokenV06 wethToken,
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount
    )
        internal
        returns (uint256 boughtAmount)
    {
        if (address(buyToken) == address(lido)) {
            if (address(sellToken) == ETH_ADDRESS) {
                // TODO(kimpers): do we want to use a referral address here
                boughtAmount = lido.submit{ value: sellAmount}(address(0));
            } else if (address(sellToken) == address(wethToken)) {
                wethToken.withdraw(sellAmount);
                boughtAmount = lido.submit{ value: sellAmount}(address(0));
            }
        }

    }
}
