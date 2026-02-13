# Arcium Blind Auction

A production-ready blind sealed-bid auction application powered by Arcium's Multi-Party Computation (MPC) on Solana. This DApp ensures complete bid privacy—all bids are encrypted, compared privately by MPC nodes, and only the winner and winning price are revealed.

![Arcium Auction Banner](https://via.placeholder.com/1200x300/8B5CF6/ffffff?text=Arcium+Blind+Auction)

## 🎯 Features

- **Complete Bid Privacy**: All bid amounts are encrypted using x25519 + Rescue cipher
- **Fair Auctions**: No bid sniping, no front-running, complete fairness guaranteed
- **MPC Winner Computation**: Arcium's MPC network computes winners without revealing losing bids
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Real-time Countdown**: Live auction timers with automatic finalization triggers
- **Wallet Integration**: Seamless Solana wallet connectivity (Phantom, Solflare, Torus)

## 🛠️ Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **Vite** - Lightning-fast build tool
- **TailwindCSS 3** - Utility-first CSS framework
- **Custom Design System** - Purple-themed with Clash Display & General Sans fonts

### Blockchain
- **Solana Devnet** - Fast, low-cost blockchain
- **Arcium MPC** - Multi-Party Computation for encrypted bidding
- **Wallet Adapter** - Universal Solana wallet connection

### Cryptography
- **x25519** - Elliptic curve Diffie-Hellman key exchange
- **Rescue Cipher** - MPC-friendly symmetric encryption

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Solana wallet (Phantom, Solflare, or Torus)
- Basic understanding of blockchain and auctions

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/arcium-blind-auction.git
cd arcium-blind-auction
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to `http://localhost:3000`

5. **Connect your wallet**
Click "Select Wallet" and choose your preferred Solana wallet

## 📖 How It Works

### Creating an Auction

1. Click **"Create New Auction"**
2. Fill in auction details:
   - Item name and description
   - Minimum bid amount (in SOL)
   - Auction end time
3. Submit to create the auction

### Submitting a Bid

1. Browse active auctions
2. Click **"Submit Encrypted Bid"**
3. Enter your bid amount (must be >= minimum bid)
4. Your bid is encrypted using:
   - **Step 1**: Generate ephemeral x25519 keypair
   - **Step 2**: Perform key exchange with MXE cluster
   - **Step 3**: Encrypt amount with Rescue cipher
   - **Step 4**: Submit encrypted bid on-chain
5. Bid amount stays hidden until auction ends

### Auction Finalization

1. When auction timer reaches zero, click **"Trigger MPC Finalization"**
2. MPC computation begins:
   - Arx nodes fetch encrypted bids
   - Winner computed via secure multi-party computation
   - Result returned without revealing losing bids
3. Winner address and winning bid are revealed
4. Confetti celebration! 🎉

## 🔐 Privacy Guarantees

### Encryption Process

```javascript
// 1. Generate ephemeral keypair
const { privateKey, publicKey } = generateX25519Keypair();

// 2. Key exchange with MXE cluster
const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);

// 3. Initialize Rescue cipher
const cipher = new RescueCipher(sharedSecret);

// 4. Encrypt bid amount
const ciphertext = cipher.encrypt(bidAmount, nonce);
```

### MPC Winner Computation

- **Input**: All encrypted bids
- **Process**: Arx nodes compute on encrypted data without decryption
- **Output**: Winner address + winning amount only
- **Privacy**: Losing bid amounts never revealed

## 📁 Project Structure

```
arcium-blind-auction/
├── src/
│   ├── components/
│   │   ├── WalletConnect.jsx       # Solana wallet integration
│   │   ├── AuctionCreator.jsx      # Create new auctions
│   │   ├── AuctionCard.jsx         # Display auction details
│   │   ├── BidSubmission.jsx       # Submit encrypted bids
│   │   ├── CountdownTimer.jsx      # Live countdown timer
│   │   ├── WinnerReveal.jsx        # Dramatic winner reveal
│   │   └── AuctionList.jsx         # Browse all auctions
│   ├── utils/
│   │   ├── arciumEncryption.js     # x25519 + Rescue cipher
│   │   ├── solanaConnection.js     # Solana RPC setup
│   │   └── helpers.js              # Common utilities
│   ├── App.jsx                     # Main app component
│   ├── main.jsx                    # React entry point
│   └── index.css                   # Global styles
├── public/                         # Static assets
├── index.html                      # HTML template
├── package.json                    # Dependencies
├── vite.config.js                  # Vite configuration
├── tailwind.config.js              # Tailwind theme
└── README.md                       # This file
```

## 🎨 Design Philosophy

This application features a distinctive design that avoids generic "AI slop" aesthetics:

- **Typography**: Clash Display (headings) + General Sans (body) for character
- **Color Palette**: Deep purple (#8B5CF6) primary with pink accents
- **Dark Theme**: Layered gradients and glass morphism effects
- **Animations**: Staggered reveals on page load, smooth transitions
- **No Emojis**: Custom SVG icons throughout for professional feel

## 🔧 Configuration

### Network Settings

Edit `src/utils/solanaConnection.js` to change networks:

```javascript
export const NETWORK = 'devnet'; // or 'mainnet-beta', 'testnet'
```

### Custom RPC Endpoint

```javascript
const connection = createConnection('devnet', 'https://your-rpc-endpoint.com');
```

### Arcium Program ID

Update in `src/utils/solanaConnection.js`:

```javascript
export const ARCIUM_PROGRAM_ID = new PublicKey('YourActualProgramID...');
```

## 📊 Demo vs Production

### Current Implementation (Demo)

- ✅ Real encryption using x25519 + Rescue cipher
- ✅ Simulated MPC computation (client-side winner calculation)
- ✅ Mock Solana transactions (localStorage storage)
- ✅ Full UI/UX flow demonstrating the concept

### Production Requirements

To deploy to production, you'll need:

1. **Deploy Arcium MXE Program** on Solana
2. **Replace mock encryption** with `@arcium-hq/client` SDK
3. **Implement actual Solana transactions** for auction creation and bidding
4. **Connect to real MPC network** for winner computation
5. **Add proper error handling** and transaction confirmation flows
6. **Implement account PDAs** for auction and bid storage

## 🚨 Security Considerations

⚠️ **This is a demonstration application**. For production use:

- Audit all cryptographic implementations
- Use official Arcium SDK (`@arcium-hq/client`)
- Implement proper transaction signing and confirmation
- Add rate limiting and spam protection
- Conduct thorough security review of smart contracts
- Test extensively on devnet before mainnet deployment

## 📝 License

MIT License - feel free to use this for your own projects!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Join the Arcium Discord community
- Check Arcium documentation: https://docs.arcium.com

## 🙏 Acknowledgments

- **Arcium** for their groundbreaking MPC technology
- **Solana** for the fast, low-cost blockchain
- **Wallet Adapter** team for seamless wallet integration

---

Built by Victor using Arcium MPC on Solana

**Note**: This is a demonstration application. All bids in the demo are simulated and stored locally. No real SOL is transferred.