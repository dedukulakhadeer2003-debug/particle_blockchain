const { genesis_configuration, block_time_to_mine } = require('../app_configuration');
const { cryptoHash } = require('../utils_core/hash_utils');
const hexToBinary = require('hex-to-binary');

class Block {
  constructor({ timestamp, lastHash, hash, data, nonce, difficulty }) {
    this.timestamp = timestamp;
    this.lastHash = lastHash;
    this.hash = hash;
    this.data = data;
    this.nonce = nonce;
    this.difficulty = difficulty;
  }

  static genesis() {
    return new this(genesis_configuration);
  }

  static mineBlock({ lastBlock, data }) {
    if (!lastBlock || !lastBlock.hash) {
      throw new Error("Invalid lastBlock provided to mineBlock()");
    }

    const lastHash = lastBlock.hash;
    let hash, timestamp;
    let { difficulty } = lastBlock;
    let nonce = 0;

    do {
      nonce++;
      timestamp = Date.now();
      difficulty = Block.adjustDifficulty({ originalBlock: lastBlock, timestamp });

      hash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
    } while (hexToBinary(hash).substring(0, difficulty) !== '0'.repeat(difficulty));

    return new this({ timestamp, lastHash, data, difficulty, nonce, hash });
  }

  static adjustDifficulty({ originalBlock, timestamp }) {
    if (!originalBlock || typeof originalBlock.difficulty !== "number") {
        throw new Error("Invalid block passed to adjustDifficulty()");
    const { difficulty } = originalBlock;

    if (difficulty < 1) return 1;

    if ((timestamp - originalBlock.timestamp) > MINE_RATE) {
      return difficulty - 1;
    }

    return difficulty + 1;
  }
}



module.exports = Block;

if (require.main === module) {
  const genesisBlock = Block.genesis();
  console.log("Genesis Block:", genesisBlock);

  const minedBlock = Block.mineBlock({ lastBlock: genesisBlock, data: "test-data" });
  console.log("Mined Block:", minedBlock);

  console.log("Difficulty adjusted to:", Block.adjustDifficulty({
    originalBlock: minedBlock,
    timestamp: Date.now() + 6000
  }));
