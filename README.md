# `@project-serum/swap-ui`

[![Build Status](https://travis-ci.com/project-serum/swap-ui.svg?branch=master)](https://travis-ci.com/project-serum/swap-ui)
[![npm](https://img.shields.io/npm/v/@project-serum/swap-ui.svg)](https://www.npmjs.com/package/@project-serum/swap-ui)

A reusable React component for swapping on the Serum DEX. The Solana program can be
found [here](https://github.com/project-serum/swap).

## Usage

#### Install

First install the required peer dependencies into your React project.

```
yarn add @material-ui/core @material-ui/icons @material-ui/lab @project-serum/anchor @solana/spl-token-registry @solana/web3.js material-ui-popup-state react-async-hook
```

Then install the package.

```
yarn add @project-serum/swap-ui
```

#### Add the Swap Component

To embed the `Swap` component into your application,
one can minimally provide an [Anchor](https://github.com/project-serum/anchor)
[Provider](https://project-serum.github.io/anchor/ts/classes/provider.html)
and [TokenListContainer](https://github.com/solana-labs/token-list).
For example,

 ```javascript
<Swap provider={provider} tokenList={tokenList} />
```

All of the complexity of communicating with the Serum DEX and managing
its data is handled internally by the component.

#### Referral Fees

To earn referral fees, one can also pass in a `referral` property,
which is the `PublicKey` of the Solana wallet that *owns* the associated
token accounts in which referral fees are paid (i.e., USDC and USDT).

## Developing

#### Install dependencies

```
yarn
```

#### Build

```
yarn build
```

## Run the example app

For local development and educational purposes, a minimal React app is provided
in the `example/` subdirectory.

To run, change directories via `cd example/` and start the app.

### Start the app

```
yarn start
```
