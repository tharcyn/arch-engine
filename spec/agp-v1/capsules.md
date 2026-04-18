# AGP v1 Capsule Portability Specification

## Overview
State Capsules are the portability backbone of AGP, encapsulating an entire governance context into a strictly immutable, cryptographically verifiable archive.

## Specification Areas
1. **Capsule Descriptor Structure**: Standardized schema for archiving governance intent.
2. **Capsule Integrity Guarantees**: SHA-384 based tamper protection.
3. **Replay Determinism Guarantees**: Re-running a capsule must yield the identical validation envelope.
4. **Signature Envelope Semantics**: Cryptographic validation of the creating authority.
5. **Federation Compatibility Rules**: Safe synchronization of capsules across registry mirrors.
6. **Cross-Org Portability Guarantees**: Porting capabilities across disjoint namespaces.
