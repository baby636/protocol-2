---
title: EMERGENCY
---

In this section we outline a playbook for handling emergencies at the
protocol level.

  ------------------------------- -------------------------------------------------- -----------------------------------------------------
                                  **What Happened?**                                 **How To Handle**

  [\#1](#release-is-broken)       Our [most recent release](./releases.html) is      Rollback the deployment.
                                  broken.                                            

  [\#2](#feature-is-broken)       A [Feature](../architecture/features.html) is      Rollback the Feature to a working version (or NIL).
                                  broken.                                            

  [\#3](#transformer-is-broken)   A [Transformer](../architecture/transformers.html) Update 0x API to use a working version (or disable).
                                  is broken.                                         

  [\#4](#funds-are-at-risk)       Funds are at risk + cannot do 1-3.                 Temporarily disable the entire protocol.
  ------------------------------- -------------------------------------------------- -----------------------------------------------------

::: {.note}
::: {.title}
Note
:::

A [Rollback
Script](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/scripts/rollback.ts)
is used to generate calldata in the sections below. This can be run
using `yarn rollback` from the
[/contracts/src/zero-ex](https://github.com/0xProject/protocol/tree/development/contracts/zero-ex)
directory. You will need an HTTP Web3 Provider URL, which can be created
in about two minutes through
[infura.org/register](https://infura.io/register). The output calldata
must be submitted to the [Exchange Proxy
Governor](../basics/addresses.html) by a 0x Multisig holder. It must
then be confirmed by a second 0x Multisig holder before it can be
executed. There is no timelock on executing rollbacks.
:::

::: {.warning}
::: {.title}
Warning
:::

Be sure to communicate with other teams and external integrators /
market makers when rolling back, as this may have downstream effects.
Because of this it is also generally not advisable to rollback more than
one release.
:::

# \#1: Release is Broken

An entire release can be rolled back; however, this should only be done
for the most recent release. Below is the calldata to rollback the most
recent [Panettone Release](./releases.html#panettone).

``` {.solidity}
0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003a00000000000000000000000000000000000000000000000000000000000000460000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000000449db64a40d9627aa400000000000000000000000000000000000000000000000000000000000000000000000000000000255a521a812c3a106206431fe22541d908d9ac190000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40f7fcd3840000000000000000000000000000000000000000000000000000000000000000000000000000000072505218aa52dada3a993e586f05838662b6c90f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40353c047b00000000000000000000000000000000000000000000000000000000000000000000000000000000f8de0e088cfd08e6d8a9aa5e257c5933c82c95000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40f68fd38d000000000000000000000000000000000000000000000000000000000000000000000000000000001ae894e63fb5b2b75a3c6e1b3daacef23e9880f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a408171c407000000000000000000000000000000000000000000000000000000000000000000000000000000001ae894e63fb5b2b75a3c6e1b3daacef23e9880f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

**To generate:**

1.  Run `yarn rollback`.
2.  Select `Deployment History`.
3.  Select the latest release to rollback (bottom of list).
4.  Select `Rollback this deployment`.
5.  Enter an RPC endpoint (HTTP Web3 Provider URL). Create one for free
    at [infura.org/register](https://infura.io/register).
6.  Hold tight while the rollback script generates calldata!
7.  The script will verify the functions to rollback. Select `y` if they
    are correct. See the [Releases Section](./releases.html).
8.  Select how many transactions to generate (sometimes the calldata can
    be quite large). Typically 1 transaction is enough.

# \#2: Feature is Broken

Individual functions from [Features](../architecture/features.html) can
be rolled back, either to an earlier version or completely removed from
the Proxy (by rolling all way back). It is generally better to rollback
entire deployments, especially if there are downstream effects.

::: {.warning}
::: {.title}
Warning
:::

Rolling back individual functions can be dangerous because we may end up
in a permutation of the system that has not been fully tested. Because
of this it is strongly recommended to rollback entire deployments. This
should only be used in extreme circumstances.
:::

**To generate:**

1.  Run `yarn rollback`.
2.  Select `Generate rollback calldata`.
3.  Scroll through and select the functions to rollback using the right
    arrow key. You can also search for a function by typing its name.
4.  Hit `<Enter>` once you\'ve selected all functions to rollback.
5.  Choose to `DISABLE` the functions or simply roll them back to a
    previous version.
6.  Select how many transactions to generate (sometimes the calldata can
    be quite large). Typically 1 transaction is enough.

# \#3: Transformer is Broken

[Transformers](../architecture/transformers.html) are trustless and do
not have access to user funds. They are also not managed by the Proxy.
If a transformer is broken, simply update 0x API to stop routing trades
through the Transformer.

# \#4: Funds Are At Risk

If funds are at risk and we must shutdown the entire protocol, run the
following calldata to temporarily disable all functionality within the
Proxy. Note: this does not include the Function Registry or Ownable.
Below is the emergency shutdown calldata as of the [Panettone
Release](./releases.html#panettone).

``` {.solidity}
0x00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000001fc000000000000000000000000000000000000000000000000000000000000026200000000000000000000000000000000000000000000000000000000000000032000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000006c0000000000000000000000000000000000000000000000000000000000000074000000000000000000000000000000000000000000000000000000000000007c0000000000000000000000000000000000000000000000000000000000000084000000000000000000000000000000000000000000000000000000000000008c0000000000000000000000000000000000000000000000000000000000000094000000000000000000000000000000000000000000000000000000000000009c00000000000000000000000000000000000000000000000000000000000000a400000000000000000000000000000000000000000000000000000000000000ac00000000000000000000000000000000000000000000000000000000000000b400000000000000000000000000000000000000000000000000000000000000bc00000000000000000000000000000000000000000000000000000000000000c400000000000000000000000000000000000000000000000000000000000000cc00000000000000000000000000000000000000000000000000000000000000d400000000000000000000000000000000000000000000000000000000000000dc00000000000000000000000000000000000000000000000000000000000000e400000000000000000000000000000000000000000000000000000000000000ec00000000000000000000000000000000000000000000000000000000000000f400000000000000000000000000000000000000000000000000000000000000fc0000000000000000000000000000000000000000000000000000000000000104000000000000000000000000000000000000000000000000000000000000010c0000000000000000000000000000000000000000000000000000000000000114000000000000000000000000000000000000000000000000000000000000011c0000000000000000000000000000000000000000000000000000000000000124000000000000000000000000000000000000000000000000000000000000012c0000000000000000000000000000000000000000000000000000000000000134000000000000000000000000000000000000000000000000000000000000013c0000000000000000000000000000000000000000000000000000000000000144000000000000000000000000000000000000000000000000000000000000014c0000000000000000000000000000000000000000000000000000000000000154000000000000000000000000000000000000000000000000000000000000015c0000000000000000000000000000000000000000000000000000000000000164000000000000000000000000000000000000000000000000000000000000016c0000000000000000000000000000000000000000000000000000000000000174000000000000000000000000000000000000000000000000000000000000017c0000000000000000000000000000000000000000000000000000000000000184000000000000000000000000000000000000000000000000000000000000018c0000000000000000000000000000000000000000000000000000000000000194000000000000000000000000000000000000000000000000000000000000019c00000000000000000000000000000000000000000000000000000000000001a400000000000000000000000000000000000000000000000000000000000001ac00000000000000000000000000000000000000000000000000000000000001b400000000000000000000000000000000000000000000000000000000000001bc00000000000000000000000000000000000000000000000000000000000001c400000000000000000000000000000000000000000000000000000000000001cc00000000000000000000000000000000000000000000000000000000000001d400000000000000000000000000000000000000000000000000000000000001dc00000000000000000000000000000000000000000000000000000000000001e400000000000000000000000000000000000000000000000000000000000001ec000000000000000000000000000000000000000000000000000000000000000449db64a40016a6d650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a400f0e8cf70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a401fb097950000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40287b071b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40346693c50000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a4037f381d80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a403cd2f0260000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a403d61ed3e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a403fb2da380000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40414e4ccf0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40415565b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40438cdfc50000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40487b5c200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40496f471e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a404d54cdb60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a4056ce180a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40625971920000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a406ba6bbc20000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a4072d17d030000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40769250ea0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a407d49ec1a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a4086a0c8d70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a4087c964190000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a4089dd02e70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a408da5cb5b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a409240529c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40954808890000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a409a4f809c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a409b0518180000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a409baa45a80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a409f1ec78b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40a656186b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40aa77476c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40ad354eeb0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40ae5504970000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40b09f1fb10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40b4658bfb0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40c5579ec80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40c853c9690000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40d0a55fb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40d9627aa40000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40dd11d2250000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40dfd007490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40e42639360000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40f028e9be0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40f6274f660000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40f6e0f6a50000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40f7c3a33b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40f7fcd3840000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000449db64a40fe55a3ef000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000032000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

**To generate:**

1.  Run `yarn rollback`.
2.  Select `Emergency shutdown calldata`.
3.  Select how many transactions to generate (sometimes the calldata can
    be quite large). Typically 1 transaction is enough.