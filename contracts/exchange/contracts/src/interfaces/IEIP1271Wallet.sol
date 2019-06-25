/*

  Copyright 2018 ZeroEx Intl.

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

pragma solidity ^0.5.9;


contract IEIP1271Wallet {

    // Magic bytes returned by EIP1271 wallets on success.
    bytes4 constant public EIP1271_MAGIC_VALUE = 0x20c13b0b;

    /// @dev Verifies that a signature is valid.
    /// @param data Arbitrary data.
    /// @param signature Signature of `data`.
    /// @return magicValue .
    function isValidSignature(
        bytes calldata data,
        bytes calldata signature
    )
        external
        view
        returns (bytes4 magicValue);
}