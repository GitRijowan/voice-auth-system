// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VoiceAuth {
    struct AuthAttempt {
        address user;
        bool success;
        uint256 timestamp;
        string voiceHash; // Simplified voiceprint hash
    }

    mapping(address => bool) public registeredUsers;
    mapping(address => string) public userVoiceprints;
    AuthAttempt[] public authAttempts;

    event AuthRecorded(address indexed user, bool success, uint256 timestamp);
    event UserRegistered(address indexed user);

    modifier onlyRegistered() {
        require(registeredUsers[msg.sender], "User not registered");
        _;
    }

    function registerUser(string memory _voiceHash) public {
        require(!registeredUsers[msg.sender], "User already registered");
        registeredUsers[msg.sender] = true;
        userVoiceprints[msg.sender] = _voiceHash;
        emit UserRegistered(msg.sender);
    }

    function authenticate(string memory _voiceHash) public onlyRegistered {
        bool success = keccak256(bytes(userVoiceprints[msg.sender])) == keccak256(bytes(_voiceHash));
        authAttempts.push(AuthAttempt({
            user: msg.sender,
            success: success,
            timestamp: block.timestamp,
            voiceHash: _voiceHash
        }));
        emit AuthRecorded(msg.sender, success, block.timestamp);
    }

    function getAuthAttemptsCount() public view returns (uint256) {
        return authAttempts.length;
    }
}