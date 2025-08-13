// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Mock version for standard EVM networks (Sepolia). NO FHE.
 * Uses plain uint64 so we can test the full flow now.
 */
contract FheDonoPotMock is Ownable {
    uint64 private _total;
    mapping(address => uint64) private _deposits;

    event Donated(address indexed from, uint64 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function donate(uint64 amount) external {
        _total += amount;
        _deposits[msg.sender] += amount;
        emit Donated(msg.sender, amount);
    }

    function getTotal() external view returns (uint64) {
        return _total;
    }

    function getMyDeposit() external view returns (uint64) {
        return _deposits[msg.sender];
    }
}
