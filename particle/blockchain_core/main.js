const Block = require('./block');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet');
const { cryptoHash } = require('../utils_core');
const { REWARD_INPUT, MINING_REWARD } = require('../app_configuration');

class Blockchain {
  constructor() {
    this.chain = [Block.genesis()];
  }

  addBlock({ data }) {
    if (!this.chain || this.chain.length === 0) {
      throw new Error('Blockchain chain is not properly initialized');
    }
    
    const lastBlock = this.chain[this.chain.length - 1];
    if (!lastBlock) {
      throw new Error('Cannot find last block in chain');
    }
    
    const newBlock = Block.mineBlock({
      lastBlock: lastBlock,
      data: data || []
    });
    
    this.chain.push(newBlock);
    return newBlock;
  }

  replaceChain(chain, validateTransactions, onSuccess) {
    if (!chain || !Array.isArray(chain)) {
      console.error('Invalid chain provided for replacement');
      return false;
    }
    
    if (chain.length <= this.chain.length) {
      console.error('The incoming chain must be longer');
      return false;
    }
    
    if (!Blockchain.isValidChain(chain)) {
      console.error('The incoming chain must be valid');
      return false;
    }

    try {
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess();
      }
      
      console.log('Replacing chain with new valid chain of length:', chain.length);
      this.chain = chain;
      return true;
    } 
  }

  validTransactionData({ chain }) {

    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      if (!block || !block.data || !Array.isArray(block.data)) {
        console.error(`Block at index ${i} has invalid data structure`);
        return false;
      }

      const transactionSet = new Set();
      let rewardTransactionCount = 0;

      for (let transaction of block.data) {
        if (!transaction) {
          console.error('Invalid transaction found in block');
          return false;
        }

        if (transaction.input.address === REWARD_INPUT.address) {
          rewardTransactionCount += 1;
          
          if (rewardTransactionCount > 1) {
            console.error('Miner rewards exceeds limit');
            return false;
          }
          
          const rewardAmount = Object.values(transaction.outputMap)[0];
          if (rewardAmount !== MINING_REWARD) {
            console.error(`Miner reward amount is invalid: expected ${MINING_REWARD}, got ${rewardAmount}`);
            return false;
          }
        } else {
          if (!Transaction.validTransaction(transaction)) {
            console.error('Invalid transaction format or signature');
            return false;
          }

          if (transaction.input.amount !== trueBalance) {
            console.error(`Invalid input amount: expected ${trueBalance}, got ${transaction.input.amount}`);
            return false;
          }

          if (transactionSet.has(transaction)) {
            console.error('An identical transaction appears more than once in the block');
            return false;
          } else {
            transactionSet.add(transaction);
          }
        }
      }
    }
    
    return true;
  }

  static isValidChain(chain) {
    if (!chain || !Array.isArray(chain) || chain.length === 0) {
      console.error('Invalid chain provided for validation');
      return false;
    }
    
    const genesisBlock = chain[0];
    const expectedGenesis = Block.genesis();

    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const previousBlock = chain[i-1];
      
      if (!block || !previousBlock) {
        console.error(`Missing block at index ${i} or ${i-1}`);
        return false;
      }

      const { timestamp, lastHash, hash, nonce, difficulty, data } = block;
      const actualLastHash = previousBlock.hash;
      const lastDifficulty = previousBlock.difficulty;

      if (lastHash !== actualLastHash) {
        console.error(`Hash mismatch at block ${i}: expected ${actualLastHash}, got ${lastHash}`);
        return false;
      }

      if (Math.abs(lastDifficulty - difficulty) > 1) {
        console.error(`Difficulty jump too large at block ${i}: from ${lastDifficulty} to ${difficulty}`);
        return false;
      }

      if (typeof timestamp !== 'number' || 
          typeof nonce !== 'number' || 
          typeof difficulty !== 'number' ||
          typeof lastHash !== 'string' ||
          typeof hash !== 'string') {
        console.error(`Invalid block structure at index ${i}`);
        return false;
      }
    }
    
    return true;
  }


  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this.chain));
  }
}

module.exports = Blockchain;
