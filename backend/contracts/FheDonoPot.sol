// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {TFHE, euint64, einput} from "fhevm/lib/TFHE.sol";

/**
 * FHE donation pot: amounts are encrypted on-chain.
 * Users can donate, grant view permissions.
 *
 * NOTE (API v0.5+):
 * - Use packed inputs: `einput` + `bytes inputProof`
 * - Convert with: TFHE.asEuint64(einput, inputProof)
 */
contract FheDonoPot is Ownable {
    euint64 private _encTotal;
    mapping(address => euint64) private _encDeposits;

    event Donated(address indexed from);
    event ViewGranted(address indexed viewer, string what);

    constructor(address initialOwner) Ownable(initialOwner) {
        // constants can still be created directly
        _encTotal = TFHE.asEuint64(0);
    }

    /// @notice Donate an encrypted amount.
    /// @param amount      packed input handle
    /// @param inputProof  proof for the packed input
    function donate(einput amount, bytes calldata inputProof) external {
        euint64 amt = TFHE.asEuint64(amount, inputProof);
        _encTotal = TFHE.add(_encTotal, amt);
        _encDeposits[msg.sender] = TFHE.add(_encDeposits[msg.sender], amt);
        emit Donated(msg.sender);
    }

    /// @notice Grant someone view rights on the total
    function grantTotalView(address viewer) external onlyOwner {
        TFHE.allow(_encTotal, viewer);
        emit ViewGranted(viewer, "total");
    }

    /// @notice Grant the caller view rights on their own deposit total
    function grantMyDepositView() external {
        TFHE.allow(_encDeposits[msg.sender], msg.sender);
        emit ViewGranted(msg.sender, "mine");
    }

    // --- Optional sealed getters (depends on your exact fhevm version) ---
    // If your TFHE has re-encryption helpers, uncomment and adapt:
    // function getTotalSealed(bytes32 userPubKey) external view returns (bytes memory) {
    //     return TFHE.reencrypt(_encTotal, userPubKey);
    // }
    // function getMyDepositSealed(bytes32 userPubKey) external view returns (bytes memory) {
    //     return TFHE.reencrypt(_encDeposits[msg.sender], userPubKey);
    // }
}
