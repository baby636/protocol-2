// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "./GasOverhead.sol";

contract HackedERC20 {

    using LibERC20TokenV06 for IERC20TokenV06;

    struct ShadowedAmount {
        bool isShadowed;
        uint256 lastTrueAmount;
        uint256 shadowedAmount;
    }

    struct Storage {
        mapping(address=>ShadowedAmount) shadowedBalances;
        mapping(address=>mapping(address=>ShadowedAmount)) shadowedAllowances;
    }

    bytes32 private constant STORAGE_SLOT = 0x64fd48372774b9637ace5c8c7a951f04ea13c793935207f2eada5382a0ec82cb;
    address private constant GAS_OVERHEAD = 0xDeF1000000000000000000000000000000001337;

    receive() external payable {}

    fallback() payable external {
        bytes memory r = _forwardCallToImpl();
        assembly { return(add(r, 32), mload(r)) }
    }

    function balanceOf(address owner)
        external
        /* view */
        returns (uint256 balance)
    {
        (ShadowedAmount memory sBal,) = _getSyncedBalance(owner);
        return sBal.shadowedAmount;
    }

    function allowance(address owner, address spender)
        external
        /* view */
        returns (uint256 allowance_)
    {
        (ShadowedAmount memory sBal,) = _getSyncedAllowance(owner, spender);
        return sBal.shadowedAmount;
    }

    function transferFrom(address from, address to, uint256 amount)
        public
        returns (bool success)
    {
        _updateAllowance(from, amount);
        success = _transferFromInternal(from, to, amount);
    }


    function transfer(address to, uint256 amount)
        external
        returns (bool success)
    {
        success = _transferFromInternal(msg.sender, to, amount);
    }

    function approve(address spender, uint256 amount)
        external
        returns (bool)
    {
        (ShadowedAmount memory sAllowance,) = _getSyncedAllowance(msg.sender, spender);
        sAllowance.shadowedAmount = amount;
        _writeSyncedAllowance(msg.sender, spender, sAllowance);
        return true;
    }

    function mint(address owner, uint256 amount)
        public
    {
        (ShadowedAmount memory sBal,) = _getSyncedBalance(owner);
        sBal.shadowedAmount = _add(
            sBal.shadowedAmount,
            amount,
            'HackedERC20/MINT_OVERFLOW'
        );
        _writeSyncedBalance(owner, sBal);
    }

    function burn(address owner, uint256 amount)
        public
    {
        (ShadowedAmount memory sBal,) = _getSyncedBalance(owner);
        sBal.shadowedAmount = _sub(
            sBal.shadowedAmount,
            amount,
            'HackedERC20/BURN_UNDERFLOW'
        );
        _writeSyncedBalance(owner, sBal);
    }

    function setBalance(address owner, uint256 amount)
        public
    {
        (ShadowedAmount memory sBal,) = _getSyncedBalance(owner);
        sBal.shadowedAmount = amount;
        _writeSyncedBalance(owner, sBal);
    }

    function setAllowance(address owner, address spender, uint256 amount)
        public
    {
        (ShadowedAmount memory sAllowance,) = _getSyncedAllowance(owner, spender);
        sAllowance.shadowedAmount = amount;
        _writeSyncedAllowance(owner, spender, sAllowance);
    }

    function _getSyncedAllowance(address owner, address spender)
        private
        /* view */
        returns (ShadowedAmount memory sAllowance, uint256 gasOverhead)
    {
        uint256 gasBefore = gasleft();
        sAllowance = _getStorage().shadowedAllowances[owner][spender];
        // We only want to measure the cost of the underlying token storage lookup
        // Not including the excess overhead of our shadow lookup
        uint256 _gasBefore = gasleft();
        uint256 trueAmount = abi.decode(
            _forwardCallToImpl(abi.encodeWithSelector(
                IERC20TokenV06.allowance.selector,
                owner,
                spender
            )),
            (uint256)
        );
        uint256 _trueGas = _gasBefore - gasleft();
        _syncShadowedAmount(sAllowance, trueAmount);
        // e.g 9000 - (1000 + 3000) = 5000 overhead 
        gasOverhead = gasBefore - (gasleft() + _trueGas);
    }

    function _getSyncedBalance(address owner)
        private
        returns (ShadowedAmount memory sBal, uint256 gasOverhead)
    {
        uint256 gasBefore = gasleft();
        sBal = _getStorage().shadowedBalances[owner];
        // We only want to measure the cost of the underlying token storage lookup
        // Not including the excess overhead of our shadow lookup
        uint256 _gasBefore = gasleft();
        uint256 trueAmount = abi.decode(
            _forwardCallToImpl(abi.encodeWithSelector(
                IERC20TokenV06.balanceOf.selector,
                owner
            )),
            (uint256)
        );
        uint256 _trueGas = _gasBefore - gasleft();
        _syncShadowedAmount(sBal, trueAmount);
        // e.g 9000 - (1000 + 3000) = 5000 overhead 
        gasOverhead = gasBefore - (gasleft() + _trueGas);
    }

    function _syncShadowedAmount(ShadowedAmount memory sAmount, uint256 trueAmount)
        private
        pure
    {
        if (!sAmount.isShadowed) {
            sAmount.isShadowed = true;
            sAmount.shadowedAmount = trueAmount;
        } else {
            // Detect balance changes that can occur from outside of ERC20
            // functions.
            if (sAmount.lastTrueAmount > trueAmount) {
                sAmount.shadowedAmount = _sub(
                    sAmount.lastTrueAmount,
                    sAmount.lastTrueAmount - trueAmount,
                    'HackedERC20/SHADOW_ADJUSTMENT_UNDERFLOW'
                );
            } else if (sAmount.lastTrueAmount < trueAmount) {
                sAmount.shadowedAmount = _add(
                    sAmount.lastTrueAmount,
                    trueAmount - sAmount.lastTrueAmount,
                    'HackedERC20/SHADOW_ADJUSTMENT_OVERFLOW'
                );
            }
        }
        sAmount.lastTrueAmount = trueAmount;
    }

    function _writeSyncedBalance(address owner, ShadowedAmount memory sBal)
        private
    {
        _getStorage().shadowedBalances[owner] = sBal;
    }

    function _writeSyncedAllowance(
        address owner,
        address spender,
        ShadowedAmount memory sAllowance
    )
        private
    {
        _getStorage().shadowedAllowances[owner][spender] = sAllowance;
    }

    function _getStorage() private pure returns (Storage storage st) {
        bytes32 slot = STORAGE_SLOT;
        assembly { st_slot := slot }
    }

    function _getOriginalImplementationAddress()
        private
        view
        returns (address impl)
    {
        return address(uint160(address(this)) + 1);
    }

    function _forwardCallToImpl()
        private
        returns (bytes memory resultData)
    {
        bool success;
        (success, resultData) =
            _getOriginalImplementationAddress().delegatecall(msg.data);
        if (!success) {
            assembly { revert(add(resultData, 32), mload(resultData)) }
        }
    }

    function _forwardCallToImpl(bytes memory callData)
        private
        returns (bytes memory resultData)
    {
        bool success;
        (success, resultData) =
            _getOriginalImplementationAddress().delegatecall(callData);
        if (!success) {
            assembly { revert(add(resultData, 32), mload(resultData)) }
        }
    }

    function _transferFromInternal(address from, address to, uint256 amount)
        internal
        returns (bool)
    {
        ShadowedAmount memory sFromBal;
        ShadowedAmount memory sToBal;
        uint256 gasOverhead;
        uint256 _gasOverhead;

        (sFromBal, _gasOverhead) = _getSyncedBalance(from);
        gasOverhead += _gasOverhead;
        sFromBal.shadowedAmount = _sub(
            sFromBal.shadowedAmount,
            amount,
            'HackedERC20/BALANCE_UNDERFLOW'
        );
        _writeSyncedBalance(from, sFromBal);

        (sToBal, _gasOverhead) = _getSyncedBalance(to);
        gasOverhead += _gasOverhead;
        sToBal.shadowedAmount = _add(
            sToBal.shadowedAmount,
            amount,
            'HackedERC20/BALANCE_OVERFLOW'
        );
        _writeSyncedBalance(to, sToBal);

        // Update the global gas overhead from a transfer call
        try
            GasOverhead(GAS_OVERHEAD).addOverhead(gasOverhead)
        { } catch { }

        return true;
    }

    function _updateAllowance(address from, uint256 amount)
        internal
    {
        (ShadowedAmount memory sAllowance, uint256 gasOverhead) = _getSyncedAllowance(from, msg.sender);
        if (from != msg.sender && sAllowance.shadowedAmount != uint256(-1)) {
            sAllowance.shadowedAmount = _sub(
                sAllowance.shadowedAmount,
                amount,
                'HackedERC20/ALLOWANCE_UNDERFLOW'
            );
            // Assume a NON MAX_UINT results in allowance update SSTORE
            _writeSyncedAllowance(from, msg.sender, sAllowance);
        } else {
            // Assume a MAX_UINT results in no allowance update SSTORE
            uint256 gasBefore = gasleft();
            _writeSyncedAllowance(from, msg.sender, sAllowance);
            gasOverhead = gasOverhead + (gasBefore - gasleft());
        }
        // Update the global gas overhead from a allowance check
        try
            GasOverhead(GAS_OVERHEAD).addOverhead(gasOverhead)
        { } catch { }
    }

    function _add(uint256 a, uint256 b, string memory errMsg)
        private
        pure
        returns (uint256 c)
    {
        c = a + b;
        require(c >= a, errMsg);
    }

    function _sub(uint256 a, uint256 b, string memory errMsg)
        private
        pure
        returns (uint256 c)
    {
        c = a - b;
        require(c <= a, errMsg);
    }
}
