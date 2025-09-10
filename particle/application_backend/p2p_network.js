const PubNub = require('pubnub');
const { v4: uuidv4 } = require('uuid');

const credentials = {
    publishKey: 'pub-c-7093d448-9b39-41e6-9c47-1922c932d52f',
    subscribeKey: 'sub-c-3e604ca2-a643-48f5-9efc-0703049bdb85',
    secretKey: 'sec-c-NDJhNjIzNTctZTY1NC00MDY4LWE4MTEtODcxZjBjMjA1Zjk3',
    uuid: uuidv4()
};

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION',
    ERROR: 'ERROR'
};

class PubSub {
    constructor({ blockchain, transactionPool }) {
        if (!blockchain) throw new Error('Blockchain instance is required');
        if (!transactionPool) throw new Error('TransactionPool instance is required');       
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;        
        this.pubnub = new PubNub({
            publishKey: credentials.publishKey,
            subscribeKey: credentials.subscribeKey,
            uuid: credentials.uuid,
            restore: true,
            heartbeatInterval: 25
        });        
        this.isConnected = false;
        this.messageQueue = [];        
        this.initializeListeners();
        this.subscribeToChannels();
    }

    initializeListeners() {
        this.pubnub.addListener({
            message: (message) => {
                this.handleIncomingMessage(message);
            },
            status: (status) => {
                this.handleStatusChange(status);
            },
            presence: (presence) => {
                this.handlePresenceChange(presence);
            }
        });
    }
 
    handleMessage(channel, message) {
        try {
            const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;            
            switch (channel) {
                case CHANNELS.BLOCKCHAIN:
                    this.handleBlockchainMessage(parsedMessage);
                    break;
                case CHANNELS.TRANSACTION:
                    this.handleTransactionMessage(parsedMessage);
                    break;
                default:
                    console.warn(`Unknown channel: ${channel}`);
                    break;
            }
        } catch (error) {
            console.error(`Error handling message on channel ${channel}:`, error);
            this.broadcastError({
                type: 'MESSAGE_HANDLING_ERROR',
                channel: channel,
                error: error.message,
            });
        }
    }
 
    handleTransactionMessage(transactionData) {
        if (!transactionData || typeof transactionData !== 'object') {
            throw new Error('Invalid transaction data format');
        }
        
        this.transactionPool.setTransaction(transactionData);
        console.log('Transaction added to pool');
    }
    
    subscribeToChannels() {
        try {
            Object.values(CHANNELS).forEach((channel) => {
                this.pubnub.subscribe({ 
                    channels: [channel],
                    withPresence: true
                });
                console.log(`Subscribed to channel: ${channel}`);
            });
        } catch (error) {
            console.error('Error subscribing to channels:', error);
            setTimeout(() => this.subscribeToChannels(), 5000);
        }
    }

    publish({ channel, message }) {
        const publishMessage = () => {
            this.pubnub.publish({ 
                channel, 
                message: typeof message === 'string' ? message : JSON.stringify(message)
            }, (status, response) => {
                if (status.error) {
                    console.error(`Publishing to ${channel} failed:`, status);
                    this.retryPublish({ channel, message });
                } else {
                    console.log(`Message published to ${channel}. Timetoken:`, response.timetoken);
                }
            });
        };

        if (this.isConnected) {
            publishMessage();
        } else {
            this.messageQueue.push({ channel, message });
            console.log(`Message queued for ${channel} (connection offline)`);
        }
    }
 
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const queuedMessage = this.messageQueue.shift();
            this.publish(queuedMessage);
        }
    }

    broadcastChain() {
        if (!this.blockchain.chain || !Array.isArray(this.blockchain.chain)) {
            console.error('Invalid blockchain data for broadcasting');
            return;
        }
        
        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain)
        });
    }

    broadcastTransaction(transaction) {
        if (!transaction || typeof transaction !== 'object') {
            console.error('Invalid transaction data for broadcasting');
            return;
        }
        
        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify(transaction)
        });
    }
module.exports = PubSub;
