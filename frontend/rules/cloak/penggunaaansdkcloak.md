4 dari 5 public function pakai Cloak SDK (yang gak: exportAuditReport cuma format ulang data, gak hit chain).

Per user action (mapping ke UI)
1. User klik tombol "Pay Bounty" di /pay

Frontend → createBountyPayment(input, ctx)
                  ↓
        [SDK] generateUtxoKeypair()       ← bikin Cloak UTXO keypair
        [SDK] getNkFromUtxoPrivateKey()   ← derive viewing key (untuk auditor)
        [SDK] createUtxo()                 ← output UTXO baru (yang akan di-claim)
        [SDK] createZeroUtxo()             ← input "kosong" untuk balance equation
        [SDK] transact()                   ← BIG ONE: gen ZK proof + submit ke Cloak relay + tunggu confirmed
        [SDK] calculateFeeBigint()         ← hitung fee (5M + 0.3% × amount)
        [our] encodeClaimTicket()          ← serialize UTXO ke ticket string
                  ↓
        Return { ticket, viewingKey, signature, feeLamports }
SDK terlibat di hampir setiap step. Dari 5-10 SDK calls per "Pay" action. Bagian terlama: transact() yang generate ZK proof (~30 detik pure-JS, ~3 detik native).

2. User klik tombol "Inspect Ticket" di /claim (sebelum claim)

Frontend → inspectClaimTicket(ticketRaw, ctx)
                  ↓
        [our] decodeClaimTicket()          ← parse ticket string
        [SDK] deserializeUtxo()            ← reconstruct UTXO dari ticket bytes
        [SDK] verifyUtxos()                ← cek nullifier on-chain (1 batched RPC call)
                  ↓
        Return { amountLamports, tokenMint, label, isClaimable }
1 SDK call (verifyUtxos) + 1 utility (deserializeUtxo). Cepat (~200-300ms). Read-only, no proof gen.

3. User klik tombol "Claim Bounty" di /claim

Frontend → claimBounty(input, ctx)
                  ↓
        [our] decodeClaimTicket()          ← parse ticket
        [SDK] deserializeUtxo()            ← reconstruct UTXO
        [Solana] Keypair.generate()        ← (mode fresh only) bikin wallet baru
        [SDK] fullWithdraw()               ← BIG ONE: gen ZK proof + relay submit
                  ↓
        Return { destination, signature, secretKey? }
1 BIG SDK call (fullWithdraw) — ini juga ~30 detik pure-JS proof gen. Sama berat-nya dengan transact().

4. User buka /audit page

Frontend → scanAuditHistory({ viewingKey }, ctx)
                  ↓
        [SDK] hexToBytes()                 ← convert VK string → bytes
        [SDK] scanTransactions()           ← BIG ONE: pull semua tx Cloak program,
                                             trial-decrypt tiap chain note dgn VK,
                                             return matches doang
                  ↓
        [our] map ScannedTransaction → AuditEntry, drop recipient field
                  ↓
        Return { entries, summary }
scanTransactions itu yang bikin Bima kena 429 storm. Ini call yang spam RPC paling banyak — 1 deposit recovered = 200-500 RPC calls.

5. User klik "Download CSV/PDF" di /audit

Frontend → exportAuditReport(history, "csv" | "pdf")
                  ↓
        [our] auditHistoryToCsv() or auditHistoryToPdf()
                  ↓
        Return Blob
0 SDK calls. Cuma format ulang data dari step #4. Sengaja kita tulis sendiri (bukan pakai SDK's formatComplianceCsv) karena SDK include recipient column → privacy hole.

Visual summary — dari Bima's perspective
User clicks	Hits Cloak SDK?	Berat?	What SDK does
💰 Pay Bounty	✅ Yes (5 calls)	🐢 ~30s	UTXO setup + ZK proof + relay submit
👁️ Inspect Ticket	✅ Yes (1 call)	⚡ <1s	Read nullifier on-chain
🎟️ Claim Bounty	✅ Yes (1 call)	🐢 ~30s	ZK proof + relay submit (withdraw)
📋 Open Audit page	✅ Yes (1 call)	🐌 ~60s	Pull all program tx, decrypt notes
📥 Download CSV/PDF	❌ No	⚡ <100ms	Pure format conversion (no chain)
Bagian SDK yang mungkin Bima penasaran
Cloak SDK menggabungkan beberapa hal:

ZK proving (generates Groth16 proof in browser via WASM) — ini yang lambat
Cryptography (Poseidon hash, ECDH, AES-GCM) — untuk UTXO + viewing key
Chain interaction (Solana web3.js wrapper) — submit tx
Relay client (HTTP to Cloak relay) — untuk dispatch tx tanpa user gas
Kita gak deal sama detail-nya — SDK abstract semuanya. Kita cuma panggil function high-level (transact, fullWithdraw, scanTransactions).