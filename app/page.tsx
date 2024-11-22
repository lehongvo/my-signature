'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import {
  requestRoninWalletConnector,
} from '@sky-mavis/tanto-connect';
import { ethers } from 'ethers';

interface TokenInfo {
  name: string;
  symbol: string;
  initAmountIn: string;
  description: string;
  extended: string;
  tokenUrlImage: string;
}

const mainContractAddress = '0xf67d83b10231001d08dd0f40fa7bea53834956d3';
const mainContractAbi = [
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'uint256', name: 'initAmountIn', type: 'uint256' },
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'string', name: 'extended', type: 'string' },
      { internalType: 'string', name: 'tokenUrlImage', type: 'string' },
    ],
    name: 'createNewToken',
    outputs: [
      { internalType: 'contract MokuToken', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'creationFee_',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export default function Page() {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    name: '',
    symbol: '',
    initAmountIn: '',
    description: '',
    extended: '',
    tokenUrlImage: '',
  });

  const [feedback, setFeedback] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'error' | 'success'>('error');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setTokenInfo((prev) => ({ ...prev, [id]: value }));
  };

  const createToken = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback('');

    try {
      // Establish connection with Ronin Wallet
      const connector = await requestRoninWalletConnector();
      await connector.connect();

      // Use Ronin Testnet (Saigon Testnet) RPC URL
      const saigonRpcUrl = 'https://saigon-testnet.roninchain.com/rpc';


      const provider = new ethers.providers.JsonRpcProvider(saigonRpcUrl);

      // Ensure the signer is linked with the wallet's address
      const accounts = await connector.getAccounts();
      console.log('Accounts:', accounts);
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in Ronin Wallet');
      }

      // Connect signer to the provider
      const signer = provider.getSigner(accounts[0]);

      const mainContract = new ethers.Contract(mainContractAddress, mainContractAbi, signer);

      const creationFee = await mainContract.creationFee_();
      console.log('Creation Fee:', ethers.utils.formatEther(creationFee));


      const totalValue = Number(creationFee) + Number(ethers.utils.parseEther(tokenInfo.initAmountIn));
      const realTotalValue = (totalValue.toString());
      console.log('Total Value:', +realTotalValue);

      const gasEstimate = await mainContract.estimateGas.createNewToken(
        tokenInfo.name,
        tokenInfo.symbol,
        ethers.utils.parseEther(tokenInfo.initAmountIn),
        tokenInfo.description,
        tokenInfo.extended,
        tokenInfo.tokenUrlImage,
        { value: totalValue }
      );
      console.log("gasEstimate", +gasEstimate);

      const tx = {
        to: mainContractAddress,
        value: totalValue,
        from: accounts[0],
        gasLimit: gasEstimate.mul(102).div(100),
        gas: ethers.utils.hexlify(Math.ceil(gasEstimate.toNumber() * 1.02)),
        data: mainContract.interface.encodeFunctionData('createNewToken', [
          tokenInfo.name,
          tokenInfo.symbol,
          ethers.utils.parseEther(tokenInfo.initAmountIn),
          tokenInfo.description,
          tokenInfo.extended,
          tokenInfo.tokenUrlImage,
        ]),
      };


      // Send the signed transaction using eth_sendRawTransaction
      const network = await connector.getProvider()
      const txHash = await network.request({
        method: 'eth_sendTransaction',
        params: [tx],
      });

      console.log('Transaction Hash:', txHash);
    } catch (error) {
      console.error('Detailed error:', error);
      setFeedbackType('error');
      setFeedback(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-zinc-950 text-white flex justify-center items-center">
      <div className="bg-white text-black p-6 rounded shadow-md w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">Create Token with Ronin Wallet</h2>
        <form onSubmit={createToken} className="space-y-4">
          <div>
            <label htmlFor="name" className="block font-semibold mb-1">
              Token Name
            </label>
            <input
              type="text"
              id="name"
              className="w-full p-2 border rounded"
              placeholder="Enter token name"
              value={tokenInfo.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label htmlFor="symbol" className="block font-semibold mb-1">
              Token Symbol
            </label>
            <input
              type="text"
              id="symbol"
              className="w-full p-2 border rounded"
              placeholder="Enter token symbol"
              value={tokenInfo.symbol}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label htmlFor="initAmountIn" className="block font-semibold mb-1">
              Initial Amount (RON)
            </label>
            <input
              type="number"
              id="initAmountIn"
              step="0.000000000000000001"
              className="w-full p-2 border rounded"
              placeholder="Enter initial amount"
              value={tokenInfo.initAmountIn}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block font-semibold mb-1">
              Description
            </label>
            <textarea
              id="description"
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Enter description"
              value={tokenInfo.description}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label htmlFor="extended" className="block font-semibold mb-1">
              Extended Info
            </label>
            <textarea
              id="extended"
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Enter extended info"
              value={tokenInfo.extended}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label htmlFor="tokenUrlImage" className="block font-semibold mb-1">
              Token URL Image
            </label>
            <input
              type="url"
              id="tokenUrlImage"
              className="w-full p-2 border rounded"
              placeholder="Enter token image URL"
              value={tokenInfo.tokenUrlImage}
              onChange={handleInputChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 rounded text-white ${isLoading
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-700'
              }`}
          >
            {isLoading ? 'Creating Token...' : 'Create Token'}
          </button>
        </form>

        {feedback && (
          <p className={`mt-4 text-center ${feedbackType === 'error' ? 'text-red-500' : 'text-green-500'
            }`}>
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}