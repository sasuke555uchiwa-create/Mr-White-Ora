# BLACKSITE — Future Offline Nearby Multiplayer Architecture

This specification defines the technical blueprint for adding **Android Offline Nearby Multiplayer** (Bluetooth Low Energy + Wi-Fi Direct / P2P Cluster) to BLACKSITE across **MR. WHITE** and **MAFIA: SHADOW CITY**, without compromising role secrecy, host integrity, or existing Firebase Online / Pass & Play modes.

> **Scope Notice:** No fake Nearby Play UI buttons, mock Bluetooth scans, or placeholder peer connections exist in the current Web/PWA build. Web browsers cannot run Google Nearby Connections API natively; Nearby P2P will be delivered via a Capacitor/Android native bridge or native Kotlin module paired with the transport abstraction below.

---

## 1. Transport Abstraction Layer (`SessionTransport`)

Both Firebase Cloud Rooms and future Android Nearby Connections will sit behind a shared client-facing session interface so game engines (`src/game/roleEngine.ts`, `src/game/mafia/mafiaEngine.ts`) stay completely transport-agnostic.

```ts
export type TransportKind = 'pass_and_play' | 'firebase_online' | 'nearby_p2p';

export interface NearbyPeerInfo {
  endpointId: string;
  callsign: string;
  avatar: string;
  connected: boolean;
  lastHeartbeatMs: number;
}

export interface SessionTransport {
  readonly kind: TransportKind;
  advertiseRoom(roomMeta: { gameType: 'mr_white' | 'mafia_shadow_city'; hostName: string }): Promise<void>;
  discoverRooms(onFound: (hostEndpointId: string, meta: Record<string, string>) => void): Promise<void>;
  connectToHost(hostEndpointId: string, playerMeta: { callsign: string; avatar: string }): Promise<void>;
  sendToHost(envelope: ClientActionEnvelope): Promise<void>;
  sendPrivateToPeer(endpointId: string, payload: PrivateRoleOrActionPayload): Promise<void>;
  broadcastPublicState(snapshot: PublicMatchSnapshot): Promise<void>;
  disconnect(): Promise<void>;
}
```

### Engine Reuse
- **State Machine Purity**: `mafiaEngine.ts` and `mr_white` reducers accept pure inputs and emit updated authoritative state.
- **Pass & Play vs. Nearby**: Pass & Play executes reducers locally and isolates secrets via screen handoffs; Nearby executes reducers on the **Host device** and dispatches targeted per-endpoint private payloads over encrypted Nearby streams.

---

## 2. Google Nearby Connections API Strategy

- **Discovery Strategy**: `Strategy.P2P_CLUSTER` (multi-device mesh/star topology suitable for 3–20 players in a room, supporting BLE discovery upgraded seamlessly to Wi-Fi Direct / Wi-Fi Aware when payloads or peer counts grow).
- **Service ID**: `com.blacksite.mrwhite.nearby.v1` (shared across Host Advertiser and Client Discoverers).
- **Star-Host Topology**:
  - One player acts as **Host Advertiser**.
  - Peers act as **Client Discoverers** connecting *only* to the Host endpoint (`endpointId`), preventing peers from sniffing traffic meant for other players.

---

## 3. Host-Authoritative Session State & Anti-Leakage Protocol

1. **Private State Stays Exclusively on Host**:
   - Full `MafiaMatchState` (with all player roles, Doctor shield history, Mafia target choices, and Detective scans) and Mr. White word pairs live *only* in Host RAM / encrypted local store.
2. **Targeted Endpoint Encryption (`sendPrivateToPeer`)**:
   - Nearby Connections natively negotiates a session key + authentication digits (`ConnectionInfo.getAuthenticationDigits()`) displayed on both Host and Client screens for visual MITM verification.
   - During Role Reveal: Host sends `Payload.fromBytes` individually to `player.endpointId` containing *only* that player's role, Mafia teammates (only if player is `mafia` or `mafia_boss`), or secret word.
   - During Night Phase: Host prompts *only* living Mafia endpoints (during Mafia turn), living Doctor endpoint, and living Detective endpoint, returning Detective scan results (`'city' | 'mafia'`, with `mafia_boss` masked as `'city'`) *only* to the Detective's `endpointId`.
3. **Public Broadcasts (`broadcastPublicState`)**:
   - All clients receive `PublicMatchSnapshot`: current phase, timers, alive/removed list, dawn public headline, vote tallies, and post-match Case File once `phase === 'ended'`.

---

## 4. Android Runtime Permissions & Hardware Preconditions

Modern Android versions require explicit, staged runtime permissions and user-friendly fallback prompts before calling `startAdvertising` or `startDiscovery`:

| Android API Level | Required Permissions (`AndroidManifest.xml` + Runtime) | Rationale |
| :--- | :--- | :--- |
| **Android 13+ (API 33+)** | `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE`, `NEARBY_WIFI_DEVICES` (`neverForLocation`) | Enables BLE discovery/advertising and Wi-Fi Direct without demanding coarse GPS when scoped cleanly. |
| **Android 12 (API 31–32)** | `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE`, `ACCESS_FINE_LOCATION` | Nearby Wi-Fi Direct / BLE scanning still requires Fine Location on API 31–32. |
| **Android 10–11 (API 29–30)** | `BLUETOOTH`, `BLUETOOTH_ADMIN`, `ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`, `ACCESS_FINE_LOCATION` | Legacy Bluetooth + Location toggle gating. |

### Radio & UX Safeguards
- Pre-flight hardware check verifies Bluetooth and Wi-Fi adapters are enabled before advertising/discovering, displaying actionable native settings deep-links when disabled.
- Never silently fail if a user denies `NEARBY_WIFI_DEVICES` or `BLUETOOTH_SCAN`; present an immediate prompt linking to App Settings or falling back to **Local Pass & Play**.

---

## 5. Disconnect, Reconnect & Host Migration Handling

- **Transient Dropout**:
  - Host marks peer `connected = false` while preserving their seat and private role keyed by a persistent per-install `deviceSessionToken` (generated once per match).
  - If the peer reconnects within the grace window, the Host verifies `(callsign + deviceSessionToken)` and replays their private role dossier + current `PublicMatchSnapshot`.
- **Unresponsive Peer During Night / Secret Vote**:
  - Configurable phase timeout auto-submits `'ABSTAIN'` (if allowed) or skips expired action without deadlocking the table.
- **Host Battery / Exit Guard**:
  - Before closing the match, Host holds wake-lock / foreground notification (`FOREGROUND_SERVICE_CONNECTED_DEVICE`) during active rounds to avoid OS suspension mid-night.

---

## 6. Phased Implementation Roadmap

1. **Stage A — Native Bridge Package**: Add `@capacitor/core` + custom Kotlin `BlacksiteNearbyPlugin` wrapping `Nearby.getConnectionsClient(context)` and permission flows.
2. **Stage B — `NearbyHostController` & `NearbyClientController`**: Wrap pure `mafiaEngine.ts` and `mr_white` reducers behind message serialization (`zod`-validated schemas) and `SessionTransport`.
3. **Stage C — Pairing Lobby & Pin Verification UI**: Reuse BLACKSITE `OnlineLobbyScreen` patterns with 4-digit Nearby authentication verification badges and signal-strength indicators.
4. **Stage D — Hardware & Multi-Device QA**: Field-test 6-to-14 device sessions across Android 11, 13, and 14 handsets (airplane-mode + Wi-Fi/BLE only, sleep/wake cycles, and mid-vote reconnects).
