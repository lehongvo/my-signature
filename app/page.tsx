"use client";

import { useEffect, useState, ReactNode } from "react";
import { ethers } from "ethers";
import Modal from "react-modal";
import axios from "axios";
import WbTokenAbi from "./ContractABI.json"

// global.d.ts (assumed to be already created and correctly typed)

export default function Home() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Modal.setAppElement(document.body);
    }
  }, []);

  const chainID = 10081;
  const RPC_URL = "https://rpc-1.testnet.japanopenchain.org:8545";
  const NFT_CONTRACT_ADDRESS = "0xeA31631d5C7a198090d09aE79f0E4ef0953F67c6";
  const WB_CONTRACT_ADDRESS = "0x7Dd44ADc9fE2b7594F1d518d74D0E6C5D0B402dE";
  const ADMIN_ADDRESS = "0x00000FC78106799b5b1dbD71f206d8f0218B28fe";

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

  const [tokenId, setTokenId] = useState(Number(0));
  const [newUrlMetadata, setNewUrlMetadata] = useState("");
  const [value, setValue] = useState("");

  const verifyIpfsLink = async (urlMetadata: string): Promise<boolean> => {
    try {
      if (!urlMetadata.includes("ipfs")) {
        throw new Error("Invalid IPFS URL");
      }

      const response = await axios.get(urlMetadata);

      if (response.status === 200 && response.data) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      throw new Error("Invalid IPFS link: " + (error as Error).message);
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
        throw new Error("Invalid IPFS link or metadata");
      }

      if (Number(tokenId) <= 0) {
        throw new Error("Token ID must be greater than 0");
      }

      if (window.ethereum) {
        await window.ethereum.request?.({ method: "eth_requestAccounts" });
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = ADMIN_ADDRESS;
      const nonce = await provider.getTransactionCount(address);

      await switchToCorrectNetwork();
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "address", "uint32", "string"],
        [address, tokenId, NFT_CONTRACT_ADDRESS, nonce, newUrlMetadata]
      );
      const sigHashBytes = ethers.utils.arrayify(messageHash);
      const signature = await signer.signMessage(sigHashBytes);

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

      if (window.ethereum) {
        await window.ethereum.request?.({
          method: "eth_requestAccounts"
        });
      }

      await switchToCorrectNetwork();

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      if (
        ethers.utils.isAddress(ADMIN_ADDRESS) === false
      ) {
        throw new Error("Invalid address!");
      }

      const address = await signer.getAddress();

      const token = new ethers.Contract(WB_CONTRACT_ADDRESS, WbTokenAbi, signer);

      const [nonce, name, version, chainId] = await Promise.all([
        token.nonces(address),
        token.name(),
        "1",
        signer.getChainId(),
      ])
      const domain = {
        name,
        version,
        chainId,
        verifyingContract: WB_CONTRACT_ADDRESS,
      }

      // if (address.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
      //   throw new Error("Owner and spender must be the same!");
      // }

      const expTenDay: number =
        Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60;

      const amountToEther = ethers.utils.parseEther(value.toString());

      const message = {
        owner: address,
        spender: ADMIN_ADDRESS,
        value: amountToEther,
        nonce: Number(nonce),
        deadline: expTenDay
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
      console.log("domain", domain);
      console.log("message", message);
      console.log("types", types);

      const signature = await signer._signTypedData(domain, types, message);
      const { v, r, s } = ethers.utils.splitSignature(signature);

      openModal(
        <>
          From with value: {address}<br />
          <br />
          To with value: {ADMIN_ADDRESS}<br />
          <br />
          Amount with value: {value.toString()}<br />
          <br />
          Deadline with value: {expTenDay}<br />
          <br />
          V with value: {v}<br />
          <br />
          R with value: {r}<br />
          <br />
          S with value: {s}<br />
          <br />
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
        <h2 className="mb-6 text-4xl font-bold text-gray-800">Update Metadata(Sp Fe)</h2>
        <div className="mb-6 w-full">
          <label className="block mb-2 text-xl font-semibold text-gray-700">Token ID</label>
          <input
            type="text"
            className="w-full p-4 text-lg border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 text-black placeholder-gray-700"
            placeholder="Enter Token ID"
            value={tokenId}
            onChange={(e) => setTokenId(Number(e.target.value))}
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
        <h2 className="mb-6 text-4xl font-bold text-gray-800">Generate Permit Signature(Sp Fee)</h2>

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
        appElement={typeof window !== 'undefined' ? document.body : undefined}
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
