const Block = require('./block');
const { genesis_configuration, block_time_to_mine } = require('../app_configuration');
const { cryptoHash } = require('../utils_core');
const hexToBinary = require('hex-to-binary');

if (!Block || !genesis_configuration || !block_time_to_mine || !cryptoHash || !hexToBinary) {
  throw new Error('Required dependencies not found. Check import paths and module availability.');
}

describe('Block', () => {
  const timestamp = 100;
  const lastHash = 'last_hash';
  const hash = 'hash';
  const data = ['blockchain', 'data'];
  const nonce = 1;
  const difficulty = 1;
  
  let block;
  try {
    block = new Block({ timestamp, lastHash, hash, data, nonce, difficulty });
  } catch (error) {
    throw new Error(`Block constructor failed: ${error.message}`);
  }
 
  it('creates a valid Block instance', () => {
    expect(block).toBeInstanceOf(Block);
    expect(block).toHaveProperty('timestamp');
    expect(block).toHaveProperty('lastHash');
    expect(block).toHaveProperty('hash');
    expect(block).toHaveProperty('data');
    expect(block).toHaveProperty('nonce');
    expect(block).toHaveProperty('difficulty');
  });

  describe('genesis()', () => {
    let genesisBlock;
    try {
      genesisBlock = Block.genesis();
    } catch (error) {
      throw new Error(`Genesis block creation failed: ${error.message}`);
    }
    
    it('returns a Block instance', () => {
      expect(genesisBlock instanceof Block).toBe(true);
    });
    
    it('has valid genesis block structure', () => {
      expect(genesisBlock).toMatchObject({
        timestamp: expect.any(Number),
        lastHash: expect.any(String),
        hash: expect.any(String),
        data: expect.anything(),
        nonce: expect.any(Number),
        difficulty: expect.any(Number)
      });
    });
  });

  describe('mineBlock', () => {
    const lastBlock = Block.genesis();
    const data = 'mined data';
    
    if (!lastBlock || !data) {
      throw new Error('Invalid input for mineBlock test');
    }
    
    let minedBlock;
    try {
      minedBlock = Block.mineBlock({ lastBlock, data });
    } catch (error) {
      throw new Error(`Block mining failed: ${error.message}`);
    }
    
    it('returns a Block instance', () => {
      expect(minedBlock instanceof Block).toBe(true);
    });
        
    it('sets the `data`', () => {
      expect(minedBlock.data).toEqual(data);
    });
      
    it('creates a SHA-256 `hash` based on the proper inputs', () => {
      expect(minedBlock.hash)
        .toEqual(
          cryptoHash(
            minedBlock.timestamp,
            minedBlock.nonce,
            minedBlock.difficulty,
            lastBlock.hash,
            data
          )
        );
    });

    it('sets a `hash` that matches the difficulty criteria', () => {
      expect(hexToBinary(minedBlock.hash).substring(0, minedBlock.difficulty))
        .toEqual('0'.repeat(minedBlock.difficulty));
    });

    it('has a valid hexadecimal hash', () => {
      expect(minedBlock.hash).toMatch(/^[0-9a-fA-F]+$/);
      expect(minedBlock.hash.length).toBeGreaterThan(0);
    });

    it('adjusts the difficulty', () => {
      const possibleResults = [lastBlock.difficulty+1, lastBlock.difficulty-1];
      expect(possibleResults.includes(minedBlock.difficulty)).toBe(true);
    });
    
    it('maintains minimum difficulty of 1', () => {
      expect(minedBlock.difficulty).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('adjustDifficulty()', () => {
    let testBlock;
    beforeEach(() => {
      testBlock = new Block({ 
        timestamp: 100, 
        lastHash: 'last_hash', 
        hash: 'hash', 
        data: ['test'], 
        nonce: 1, 
        difficulty: 3 
      });
    });
    
    it('raises the difficulty for a quickly mined block', () => {
      expect(Block.adjustDifficulty({
        originalBlock: testBlock,
        timestamp: testBlock.timestamp + block_time_to_mine - 100
      })).toEqual(testBlock.difficulty + 1);
    });
    
    it('lowers the difficulty for a slowly mined block', () => {
      expect(Block.adjustDifficulty({
        originalBlock: testBlock,
        timestamp: testBlock.timestamp + block_time_to_mine + 100
      })).toEqual(testBlock.difficulty - 1);
    });
    
    it('handles minimum difficulty correctly', () => {
      testBlock.difficulty = 1;
      const adjusted = Block.adjustDifficulty({
        originalBlock: testBlock,
        timestamp: testBlock.timestamp + block_time_to_mine + 1000
      });
      expect(adjusted).toEqual(1);
    });
    
    it('handles missing timestamp parameter', () => {
      const currentTime = Date.now();
      const adjusted = Block.adjustDifficulty({ originalBlock: testBlock });
      expect([testBlock.difficulty + 1, testBlock.difficulty - 1]).toContain(adjusted);
    });
  });
});

module.exports = { Block };
