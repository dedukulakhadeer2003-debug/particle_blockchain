const Blockchain = require('../blockchain_core');
const blockchain = new Blockchain();

blockchain.addBlock({ data: 'initial' });
console.log('first block', blockchain.chain[blockchain.chain.length-1]);

let prevTimestamp, nextTimestamp, nextBlock, timeDiff, average;
const times = [];

for (let i = 0; i < 10000; i++) {
  prevTimestamp = blockchain.chain[blockchain.chain.length-1].timestamp;
  blockchain.addBlock({ data: `block: ${i}` });
  nextBlock = blockchain.chain[blockchain.chain.length-1];
  nextTimestamp = nextBlock.timestamp;
  timeDiff = nextTimestamp - prevTimestamp;
  times.push(timeDiff);
  average = times.reduce((total, num) => (total + num)) / times.length;
}

if (blockchain.chain.length === 10001) {
  console.log('Successfully mined 10000 blocks');
} else {
  console.log('Block mining completed with', blockchain.chain.length - 1, 'blocks');
}
