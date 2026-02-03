// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PoolNFT is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    string private _baseTokenURI;
    uint256 private _tokenIdCounter;

    event NFTMinted(address indexed to, uint256 indexed tokenId);

    constructor(string memory baseURI_)
        ERC721("PoolNFT", "PNFT")
        Ownable(msg.sender)
    {
        _baseTokenURI = baseURI_;
        _tokenIdCounter = 0;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Override tokenURI to append .json extension
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 
            ? string.concat(baseURI, tokenId.toString(), ".json") 
            : "";
    }

    function mint(address to) external onlyOwner nonReentrant {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId);
        emit NFTMinted(to, tokenId);
    }

    function mintBatch(address to, uint256 quantity) external onlyOwner nonReentrant {
        for (uint256 i = 0; i < quantity; i++) {
            _tokenIdCounter++;
            uint256 tokenId = _tokenIdCounter;
            _safeMint(to, tokenId);
            emit NFTMinted(to, tokenId);
        }
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
