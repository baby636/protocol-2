// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;

contract GasOverhead {
    uint256 public _overhead;
    // Overhead incurred from the caller calling this to update
    uint256 constant CALL_OVERHEAD = 5000;
    // Overhead incurred from updating the overhead storage slot
    uint256 constant SSTORE_OVERHEAD = 20000;

    function addOverhead(uint256 gas)
        external
    {
        // Add additional est overhead of performing this update
        _overhead += gas + CALL_OVERHEAD + SSTORE_OVERHEAD;
    }

    function overhead()
        external
        view
        returns (uint256)
    {
        return _overhead;
    }
}
