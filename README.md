# 🔐 SuiPass - Decentralized Password Manager

<div align="center">

![SuiPass Logo](./assets/logo.svg)

**Your Passwords, Truly Yours**

A decentralized password manager built on Sui blockchain with Seal encryption and Walrus storage.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Sui Network](https://img.shields.io/badge/Sui-Testnet-4DA2FF)](https://sui.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Move](https://img.shields.io/badge/Move-2024-orange)](https://move-book.com/)

[Live Demo](https://suipass.vercel.app) • [Documentation](./docs) • [Report Bug](https://github.com/yourusername/suipass/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Why SuiPass?](#why-suipass)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## 🌟 Overview

SuiPass is a Web3-native password manager that puts YOU in control of your data. Unlike traditional password managers (1Password, Bitwarden, LastPass), SuiPass leverages Sui blockchain's cutting-edge primitives to deliver:

- 🔐 **True Privacy**: Seal encryption ensures only you can decrypt your passwords
- 📦 **True Ownership**: Your data lives on Walrus, not in corporate databases
- 🎫 **Zero Friction**: zkLogin with Google - no seed phrases, no wallets
- 🌐 **Always Available**: Decentralized storage means no vendor lock-in
- 💰 **Free Forever**: Pay only minimal gas fees (~$0.01 per operation)

**Built for**: First Movers Sprint 2026 & CommandOSS Hackathon

---

## ✨ Key Features

### 🔒 Security & Privacy

- **Seal Encryption** (Jan 2026 release): Client-side encryption with decentralized key management
- **Walrus Storage**: Your encrypted passwords stored on decentralized, censorship-resistant network
- **Zero-Knowledge Architecture**: We never see your passwords - mathematically impossible
- **No Central Database**: Eliminates single point of failure for data breaches

### 🚀 User Experience

- **zkLogin Authentication**: Sign in with Google - no crypto knowledge required
- **Cross-Device Sync**: Automatic sync via Walrus - works on any device
- **Browser Extension**: Quick access popup + right-click autofill
- **Mobile Responsive**: Full-featured mobile web interface
- **Password Generator**: Cryptographically secure random password generation

### 🌐 Web3 Native

- **Sui Move Smart Contracts**: Immutable, auditable vault logic
- **On-Chain Metadata**: Vault ownership and versioning on Sui blockchain
- **PTB Support**: Programmable Transaction Blocks for efficient operations
- **True Data Portability**: Export and import your vault anytime

---

## 🤔 Why SuiPass?

### vs Traditional Password Managers

| Feature | 1Password | Bitwarden | LastPass | **SuiPass** |
|---------|-----------|-----------|----------|-------------|
| **Cost** | $3-8/mo | $10/year | $3/mo | **~$2-5/year** (gas only) |
| **Data Ownership** | ❌ Company | ❌ Company | ❌ Company | **✅ You** |
| **Decentralized** | ❌ | ❌ | ❌ | **✅** |
| **Vendor Lock-in** | ✅ Yes | ✅ Yes | ✅ Yes | **❌ No** |
| **E2E Encrypted** | ✅ | ✅ | ✅ | **✅** |
| **Open Source** | ❌ | ✅ | ❌ | **✅** |
| **Recovery Method** | Master password | Master password | Email | **Google OAuth** |

### Key Differentiators

1. **You own your data**: Passwords stored on Walrus network YOU control
2. **No subscriptions**: One-time gas fees, no recurring charges
3. **Censorship resistant**: No government or company can revoke access
4. **Latest tech**: Seal (Jan 2026), zkLogin, Walrus - cutting edge
5. **Privacy by design**: Zero-knowledge, trustless architecture

---

## 🏗️ Architecture

### High-Level System Design

```
┌──────────────────────────────────────────────────────────┐
│                   CLIENT LAYER                            │
│   Web App  |  Browser Extension  |  Mobile Web           │
└────────────┬─────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────┐
│             INTEGRATION LAYER                             │
│   Sui dApp Kit  |  Seal SDK  |  Walrus SDK               │
└────────────┬─────────────────────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
┌────▼────┐      ┌───▼────┐
│   Sui   │      │ Walrus │
│Blockchain│      │Storage │
│         │      │        │
│ Vault   │      │Encrypted│
│Registry │      │ Blobs  │
└─────────┘      └────────┘
```

### Data Flow

**Adding a Password:**
1. User enters password in UI
2. Frontend encrypts with Seal
3. Upload encrypted blob to Walrus → get `blob_id`
4. Update Vault object on Sui with `blob_id`
5. Transaction confirmed → password saved

**Retrieving a Password:**
1. Query Vault object from Sui
2. Download encrypted blob from Walrus using `blob_id`
3. Decrypt with Seal
4. Display password to user

---

## 🛠️ Tech Stack

### Smart Contracts
- **Language**: Sui Move 2024
- **Network**: Sui Testnet (→ Mainnet)
- **Framework**: Sui Framework v1.63.1

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **UI Components**: shadcn/ui
- **State Management**: TanStack Query + Zustand
- **Sui Integration**: @mysten/dapp-kit, @mysten/sui

### Infrastructure
- **Blockchain**: Sui Testnet
- **Storage**: Walrus Decentralized Storage
- **Encryption**: Seal SDK (+ tweetnacl for MVP)
- **Auth**: zkLogin (Google OAuth)
- **Hosting**: Vercel (frontend), Sui (contracts)

### Development Tools
- **Package Manager**: npm
- **Linter**: ESLint
- **Formatter**: Prettier
- **Git Hooks**: Husky
- **CI/CD**: GitHub Actions

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.20.4 or higher
- **Sui CLI**: v1.63.1 or higher
- **npm**: v9+ or yarn
- **Git**: Latest version

### Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/suipass.git
cd suipass

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your values:
# - VITE_SUI_PACKAGE_ID=0x... (from deployment)
# - VITE_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
# - VITE_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# 4. Deploy smart contracts
cd contracts/suipass_vault
sui client publish --gas-budget 100000000
# Copy the Package ID

# 5. Start development server
cd ../../frontend
npm run dev

# 6. Open browser
open http://localhost:5173
```

### Detailed Setup

See [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) for comprehensive setup instructions including:
- Sui CLI installation for MacBook M1
- Testnet faucet setup
- zkLogin configuration
- Extension development setup

---

## 📁 Project Structure

```
suipass/
├── contracts/                 # Sui Move smart contracts
│   └── suipass_vault/
│       ├── Move.toml
│       └── sources/
│           ├── vault.move     # Main vault contract
│           └── events.move    # Event definitions
│
├── frontend/                  # React web application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── Auth/         # Authentication components
│   │   │   ├── Vault/        # Vault management components
│   │   │   └── Password/     # Password entry components
│   │   ├── lib/              # Core libraries
│   │   │   ├── sui/          # Sui blockchain integration
│   │   │   ├── seal/         # Encryption utilities
│   │   │   ├── walrus/       # Walrus storage client
│   │   │   └── utils/        # Helper functions
│   │   ├── hooks/            # Custom React hooks
│   │   ├── types/            # TypeScript type definitions
│   │   └── App.tsx           # Main application component
│   ├── public/               # Static assets
│   ├── package.json
│   └── vite.config.ts
│
├── extension/                 # Browser extension
│   ├── manifest.json         # Extension manifest (V3)
│   ├── popup/                # Popup UI
│   ├── background/           # Service worker
│   └── icons/                # Extension icons
│
├── docs/                      # Documentation
│   ├── TECHNICAL_DESIGN.md   # Technical design document
│   ├── IMPLEMENTATION_PLAN.md # 6-day development plan
│   ├── UI_DESIGN_SPECS.md    # UI/UX specifications
│   ├── SETUP_GUIDE.md        # Setup instructions
│   └── API_REFERENCE.md      # API documentation
│
├── scripts/                   # Utility scripts
│   ├── deploy.sh             # Smart contract deployment
│   ├── test-integration.ts   # Integration tests
│   └── generate-icons.sh     # Icon generation
│
├── assets/                    # Design assets
│   ├── logo.svg
│   ├── screenshots/
│   └── icons/
│
├── .github/                   # GitHub configuration
│   └── workflows/
│       └── ci.yml            # CI/CD pipeline
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 💻 Development

### Running Locally

```bash
# Terminal 1: Run frontend
cd frontend
npm run dev

# Terminal 2: Watch smart contract changes
cd contracts/suipass_vault
sui move build --watch

# Terminal 3: Run extension (optional)
cd extension
npm run dev
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Build extension
cd extension
npm run build

# Test production build
npm run preview
```

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run typecheck
```

---

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts/suipass_vault
sui move test
```

### Frontend Tests

```bash
cd frontend
npm run test
npm run test:coverage
```

### E2E Tests

```bash
cd frontend
npm run test:e2e
```

---

## 🚢 Deployment

### Deploy Smart Contracts

```bash
cd contracts/suipass_vault

# Deploy to testnet
sui client publish --gas-budget 100000000

# Save the Package ID
echo "VITE_SUI_PACKAGE_ID=0x..." >> ../../frontend/.env.local
```

### Deploy Frontend

```bash
cd frontend

# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to any static host
# - Netlify
# - Cloudflare Pages
# - GitHub Pages
```

### Package Extension

```bash
cd extension
npm run build

# Creates:
# - dist/chrome.zip (Chrome/Edge)
# - dist/firefox.xpi (Firefox)

# Upload to:
# - Chrome Web Store
# - Firefox Add-ons
```

---

## 📚 Documentation

### Core Documents

- **[Technical Design](./docs/TECHNICAL_DESIGN.md)**: Complete system architecture and design decisions
- **[Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)**: 6-day development timeline with detailed tasks
- **[UI Design Specs](./docs/UI_DESIGN_SPECS.md)**: Design system, components, and AI prompts
- **[Setup Guide](./docs/SETUP_GUIDE.md)**: Environment setup for MacBook M1
- **[API Reference](./docs/API_REFERENCE.md)**: Smart contract and SDK API documentation

### External Resources

- **Sui Documentation**: https://docs.sui.io
- **Move Book**: https://move-book.com
- **Seal Documentation**: https://seal-docs.wal.app
- **Walrus Documentation**: https://docs.wal.app
- **zkLogin Guide**: https://docs.sui.io/concepts/cryptography/zklogin

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Follow Move best practices (see docs/MOVE_BEST_PRACTICES.md)
- Ensure all tests pass before submitting PR

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Mysten Labs**: For creating Sui blockchain and providing excellent documentation
- **Sui Foundation**: For hackathon support and ecosystem growth
- **CommandOSS**: For organizing First Movers Sprint 2026
- **Open Source Community**: For the amazing tools and libraries


---

## 🎯 Hackathon Submission

**Event**: First Movers Sprint 2026  
**Track**: Team Track (Solo Developer)  
**Category**: Infrastructure / Security  

**Judging Criteria Alignment**:
- ✅ **Technical Implementation (40%)**: Full-stack Sui integration, Seal encryption, Walrus storage
- ✅ **Innovation (30%)**: First to use Seal (Jan 2026), novel UX with zkLogin
- ✅ **UI/UX (15%)**: Polished interface, Web2-quality experience
- ✅ **Business Viability (15%)**: Clear value prop, real-world problem solving

**Demo Video**: [YouTube Link]  
**Presentation**: [Slides Link]  
**Deployed App**: https://suipass.vercel.app


---

<div align="center">

**Made with ❤️ for the Sui ecosystem**

⭐ Star this repo if you find it useful!

</div>
