"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Modal from "react-modal";

export default function Home() {
  useEffect(() => {
    const appElement = document.getElementById("__next");
    if (appElement) {
      Modal.setAppElement(appElement);
    } else {
      console.warn("No element found with ID '__next'");
    }
  }, []);

  const chainID = 10081;
  const RPC_URL = "https://rpc-1.testnet.japanopenchain.org:8545";
  const NFT_CONTRACT_ADDRESS = "0x4950B69979942C235e5b576826Eedb77eaf6ff00";

  const switchToCorrectNetwork = async () => {
    const chainIDHex = ethers.utils.hexValue(chainID);
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIDHex }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIDHex,
                chainName: 'Japan Open Chain Testnet',
                rpcUrls: [RPC_URL],
                nativeCurrency: {
                  name: 'JOY',
                  symbol: 'JOY',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://explorer.testnet.japanopenchain.org/'],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add network:", addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  };

  const [tokenId, setTokenId] = useState("");
  const [newUrlMetadata, setNewUrlMetadata] = useState("");
  const [owner, setOwner] = useState("");
  const [spender, setSpender] = useState("");
  const [value, setValue] = useState("");
  const [nonce, setNonce] = useState("");
  const [deadline, setDeadline] = useState("");

  const handlePermitSubmit = async () => {
    try {
      const domain = {
        name: "My Token",
        version: "1",
        chainId: chainID,
        verifyingContract: NFT_CONTRACT_ADDRESS,
      };

      const message = {
        owner,
        spender,
        value: ethers.utils.parseUnits(value, 18), // Ensure value is correctly formatted
        nonce: parseInt(nonce),
        deadline: parseInt(deadline),
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      if (typeof window.ethereum === 'undefined') {
        throw new Error("MetaMask is not installed!");
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const signature = await signer._signTypedData(domain, types, message);

      const { v, r, s } = ethers.utils.splitSignature(signature);

      alert(`Signature v: ${v}, r: ${r}, s: ${s}`);
    } catch (error) {
      console.error("Error generating permit signature:", error);
      alert("Error generating permit signature. Please check the console for more details.");
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left half for metadata update */}
      <div className="w-1/2 p-8 bg-gray-100 flex flex-col justify-center items-center">
        <h2 className="mb-4 text-xl font-semibold">Update Metadata</h2>
        <div className="mb-4 w-full">
          <label className="block mb-2">Token ID</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 text-black"
            placeholder="Enter Token ID"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
          />
        </div>
        <div className="mb-4 w-full">
          <label className="block mb-2">New URL Metadata</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 text-black"
            placeholder="Enter New URL Metadata"
            value={newUrlMetadata}
            onChange={(e) => setNewUrlMetadata(e.target.value)}
          />
        </div>
        <button
          className="px-4 py-2 mt-4 text-white bg-blue-500 rounded-md hover:bg-blue-600"
          onClick={handlePermitSubmit}
        >
          Get Signature Update Metadata
        </button>
      </div>

      {/* Right half for permit signature */}
      <div className="w-1/2 p-8 bg-gray-200 flex flex-col justify-center items-center">
        <h2 className="mb-4 text-xl font-semibold">Generate Permit Signature</h2>
        <div className="mb-4 w-full">
          <label className="block mb-2">Owner</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 text-black"
            placeholder="Enter Owner Address"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </div>
        <div className="mb-4 w-full">
          <label className="block mb-2">Spender</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 text-black"
            placeholder="Enter Spender Address"
            value={spender}
            onChange={(e) => setSpender(e.target.value)}
          />
        </div>
        <div className="mb-4 w-full">
          <label className="block mb-2">Value</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 text-black"
            placeholder="Enter Value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="mb-4 w-full">
          <label className="block mb-2">Nonce</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 text-black"
            placeholder="Enter Nonce"
            value={nonce}
            onChange={(e) => setNonce(e.target.value)}
          />
        </div>
        <div className="mb-4 w-full">
          <label className="block mb-2">Deadline</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 text-black"
            placeholder="Enter Deadline"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <button
          className="px-4 py-2 mt-4 text-white bg-blue-500 rounded-md hover:bg-blue-600"
          onClick={handlePermitSubmit}
        >
          Get Permit Signature
        </button>
      </div>
    </div>
  );
}
