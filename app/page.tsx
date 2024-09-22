"use client";

import { useEffect, useState, ReactNode } from "react";
import { ethers } from "ethers";
import Modal from "react-modal";
import axios from "axios";

// global.d.ts (assumed to be already created and correctly typed)

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

  // State to handle modal visibility and message
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState<ReactNode>(null);
  const [modalMessageText, setModalMessageText] = useState<ReactNode>("Update Metadata With Signature");

  const openModal = (message: ReactNode) => {
    setModalMessage(message);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const switchToCorrectNetwork = async (): Promise<void> => {
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed!");
    }

    if (window.ethereum) {
      await window.ethereum.request?.({ method: "eth_requestAccounts" });
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const networkData = await provider.getNetwork();
    const chainIDHex = ethers.utils.hexValue(chainID);

    if (Number(networkData.chainId) !== Number(chainIDHex)) {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          await window.ethereum.request?.({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIDHex }],
          });
        } catch (switchError: unknown) {
          if (
            typeof switchError === "object" &&
            switchError !== null &&
            "code" in switchError &&
            (switchError).code === 4902
          ) {
            try {
              await window.ethereum.request?.({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: chainIDHex,
                    chainName: "Japan Open Chain Testnet",
                    rpcUrls: [RPC_URL],
                    nativeCurrency: {
                      name: "JOY",
                      symbol: "JOY",
                      decimals: 18,
                    },
                    blockExplorerUrls: [
                      "https://explorer.testnet.japanopenchain.org/",
                    ],
                  },
                ],
              });
            } catch (addError: unknown) {
              console.error("Failed to add network:", addError);
              openModal(`Failed to add network: ${addError}`);
            }
          } else {
            openModal(`Failed to switch network: ${switchError}`);
          }
        }
      } else {
        openModal("MetaMask is not installed. Please install MetaMask to continue.");
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

  const convertToMetadata = (url: string) => {
    const metadata = url.replace("ipfs://", "https://ipfs.io/ipfs/");
    return metadata;
  };

  const verifyIpfsLink = async (urlMetadata: string): Promise<boolean> => {
    try {
      if (!urlMetadata.startsWith("ipfs://")) {
        throw new Error("Invalid IPFS URL");
      }

      const ipfsGatewayUrl = convertToMetadata(urlMetadata);

      const response = await axios.get(ipfsGatewayUrl);

      if (response.status === 200 && response.data) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      throw new Error("Invalid IPFS link" + (error as Error).message);
    }
  };

  const handleUpdateSignature = async (): Promise<void> => {
    try {
      setModalMessageText("Update Metadata With Signature");
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask is not installed!");
      }

      const isValidIpfsLink = await verifyIpfsLink(newUrlMetadata);
      if (!isValidIpfsLink) {
        throw new Error("Invalid IPFS link");
      }

      if (Number(tokenId) <= 0) {
        throw new Error("Token ID must be greater than 0");
      }

      if (window.ethereum) {
        await window.ethereum.request?.({ method: "eth_requestAccounts" });
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const nonce = await provider.getTransactionCount(address);

      await switchToCorrectNetwork();

      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "address", "uint32", "string"],
        [address, tokenId, NFT_CONTRACT_ADDRESS, nonce, newUrlMetadata]
      );
      const sigHashBytes = ethers.utils.arrayify(messageHash);
      const signingMessage = ethers.utils.hexlify(sigHashBytes);
      const signature = await signer.signMessage(signingMessage);

      openModal(`Signature: ${signature}`);
    } catch (error) {
      console.error("Error updating metadata:", error);
      openModal(`Error updating metadata: ${(error as Error).message}`);
    }
  };

  const handlePermitSubmit = async (): Promise<void> => {
    try {
      setModalMessageText("Permit With Signature");
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask is not installed!");
      }

      if (
        ethers.utils.isAddress(owner) === false ||
        ethers.utils.isAddress(spender) === false
      ) {
        throw new Error("Invalid address!");
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const nonce = await provider.getTransactionCount(address);

      if (owner.toLowerCase() === spender.toLowerCase()) {
        throw new Error("Owner and spender must be the same!");
      }

      const domain = {
        name: "My Token",
        version: "1",
        chainId: chainID,
        verifyingContract: NFT_CONTRACT_ADDRESS,
      };

      const expTenDay: number =
        Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60;

      if (Number(value) <= 0 || Number(nonce) < 0 || Number(deadline) < 0) {
        throw new Error("Value, nonce, and deadline must be greater than 0");
      }

      const message = {
        owner,
        spender,
        value: ethers.utils.parseUnits(value, 18),
        nonce: Number(nonce),
        deadline: (Math.ceil(expTenDay) + Number(deadline)).toString(),
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

      const signature = await signer._signTypedData(domain, types, message);
      const { v, r, s } = ethers.utils.splitSignature(signature);

      openModal(
        <>
          V with value: {v}<br />
          <br />
          R with value: {r}<br />
          <br />
          S with value: {s}<br />
          <br />
          Signature with value: {signature}
        </>
      );
    } catch (error: unknown) {
      console.error("Error generating permit signature:", error);
      openModal(`Error generating permit signature: ${error}`);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Left half for metadata update */}
      <div className="w-1/2 p-10 bg-white shadow-lg rounded-md flex flex-col justify-center items-center">
        <h2 className="mb-6 text-4xl font-bold text-gray-800">Update Metadata</h2>
        <div className="mb-6 w-full">
          <label className="block mb-2 text-xl font-semibold text-gray-700">Token ID</label>
          <input
            type="text"
            className="w-full p-4 text-lg border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 text-black placeholder-gray-700"
            placeholder="Enter Token ID"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
          />
        </div>
        <div className="mb-6 w-full">
          <label className="block mb-2 text-xl font-semibold text-gray-700">New URL Metadata</label>
          <input
            type="text"
            className="w-full p-4 text-lg border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 text-black placeholder-gray-700"
            placeholder="Enter New URL Metadata"
            value={newUrlMetadata}
            onChange={(e) => setNewUrlMetadata(e.target.value)}
          />
        </div>
        <button
          className="w-full py-4 mt-4 text-lg text-white bg-blue-600 rounded-md hover:bg-blue-700 font-bold shadow-lg transition-all"
          onClick={handleUpdateSignature}
        >
          Get Signature Update Metadata
        </button>
      </div>

      {/* Right half for permit signature */}
      <div className="w-1/2 p-10 bg-white shadow-lg rounded-md flex flex-col justify-center items-center">
        <h2 className="mb-6 text-4xl font-bold text-gray-800">Generate Permit Signature</h2>
        <div className="mb-6 w-full">
          <label className="block mb-2 text-xl font-semibold text-gray-700">Owner</label>
          <input
            type="text"
            className="w-full p-4 text-lg border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 text-black placeholder-gray-700"
            placeholder="Enter Owner Address"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </div>
        <div className="mb-6 w-full">
          <label className="block mb-2 text-xl font-semibold text-gray-700">Spender</label>
          <input
            type="text"
            className="w-full p-4 text-lg border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 text-black placeholder-gray-700"
            placeholder="Enter Spender Address"
            value={spender}
            onChange={(e) => setSpender(e.target.value)}
          />
        </div>
        <div className="mb-6 w-full">
          <label className="block mb-2 text-xl font-semibold text-gray-700">Value</label>
          <input
            type="text"
            className="w-full p-4 text-lg border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 text-black placeholder-gray-700"
            placeholder="Enter Value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="mb-6 w-full">
          <label className="block mb-2 text-xl font-semibold text-gray-700">Nonce</label>
          <input
            type="text"
            className="w-full p-4 text-lg border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 text-black placeholder-gray-700"
            placeholder="Enter Nonce"
            value={nonce}
            onChange={(e) => setNonce(e.target.value)}
          />
        </div>
        <div className="mb-6 w-full">
          <label className="block mb-2 text-xl font-semibold text-gray-700">Deadline</label>
          <input
            type="text"
            className="w-full p-4 text-lg border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 text-black placeholder-gray-700"
            placeholder="Enter Deadline"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <button
          className="w-full py-4 mt-4 text-lg text-white bg-blue-600 rounded-md hover:bg-blue-700 font-bold shadow-lg transition-all"
          onClick={handlePermitSubmit}
        >
          Get Permit Signature
        </button>
      </div>

      {/* Modal for displaying messages */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Styled Modal"
        className="p-20 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-2xl w-full max-w-3xl mx-auto flex flex-col justify-center items-center"
        overlayClassName="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center"
      >
        <h2 className="text-5xl font-extrabold mb-4 text-white">🌟 {modalMessageText}</h2>
        <p className="mb-8 text-3xl text-white text-left break-words w-full overflow-x-auto">
          {modalMessage}
        </p>
        <button
          className="px-10 py-5 text-3xl text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-transform transform hover:scale-105 font-bold shadow-lg"
          onClick={closeModal}
        >
          Close
        </button>
      </Modal>
    </div>
  );
}
