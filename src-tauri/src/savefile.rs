//! Liest Team, Boxen, Beutel und Orden aus Spielständen (Gen 3 und 5).
//! Formate nach PKHeX (PKHeX.Core/Saves, PokeCrypto, Items/Bags).

use serde::Serialize;

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Mon {
    species_id: u16,
    nickname: Option<String>,
    exp: u32,
    /// Item-Nummer der Generation (0 = keins)
    item: u16,
    moves: Vec<u16>,
    /// Wesen-Nummer im Spiel (0–24)
    nature: u8,
    ivs: StatSet,
    evs: StatSet,
    /// Nur im Team gespeichert; in Boxen aus `exp` berechnen
    #[serde(skip_serializing_if = "Option::is_none")]
    level: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stats: Option<PartyStats>,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PartyStats {
    hp: u16,
    max_hp: u16,
    atk: u16,
    def: u16,
    spa: u16,
    spd: u16,
    spe: u16,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct StatSet {
    hp: u8,
    atk: u8,
    def: u8,
    spa: u8,
    spd: u8,
    spe: u8,
}

impl StatSet {
    /// Spielreihenfolge: KP, Angr., Vert., Init., Sp.-Angr., Sp.-Vert.
    fn from_game([hp, atk, def, spe, spa, spd]: [u8; 6]) -> Self {
        StatSet { hp, atk, def, spa, spd, spe }
    }

    fn evs(d: &[u8]) -> Self {
        Self::from_game([d[0], d[1], d[2], d[3], d[4], d[5]])
    }

    /// 6 × 5 Bit ab Bit 0
    fn ivs(packed: u32) -> Self {
        Self::from_game([0, 5, 10, 15, 20, 25].map(|shift| ((packed >> shift) & 31) as u8))
    }
}

#[derive(Serialize, Debug, PartialEq)]
pub struct BoxData {
    name: String,
    /// 30 Plätze, `null` = leer
    mons: Vec<Option<Mon>>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Pocket {
    id: &'static str,
    /// [Item-Nummer, Anzahl]
    items: Vec<[u16; 2]>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct SaveData {
    team: Vec<Mon>,
    boxes: Vec<BoxData>,
    bag: Vec<Pocket>,
    /// Bit i = i-ter Orden in Spielreihenfolge (wie static/data/badges.json)
    badges: u8,
}

/// Position des logischen Blocks i bei Shuffle-Wert sv: BLOCK_POSITION[sv * 4 + i]
const BLOCK_POSITION: [u8; 96] = [
    0, 1, 2, 3, 0, 1, 3, 2, 0, 2, 1, 3, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 2, 1, 1, 0, 2, 3, 1, 0, 3, 2, //
    2, 0, 1, 3, 3, 0, 1, 2, 2, 0, 3, 1, 3, 0, 2, 1, 1, 2, 0, 3, 1, 3, 0, 2, 2, 1, 0, 3, 3, 1, 0, 2, //
    2, 3, 0, 1, 3, 2, 0, 1, 1, 2, 3, 0, 1, 3, 2, 0, 2, 1, 3, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 2, 1, 0,
];

/// Gen-3-Artnummer ab 277 minus Nationaldex-Nr. (277..=411 → 252..=386)
const G3_TO_NATIONAL: [i8; 135] = [
    -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, -25, //
    -25, -25, -25, -25, -11, -11, -11, -28, -28, -21, -21, 19, -31, -31, -28, -28, 7, 7, -15, -15, //
    35, 25, 25, -21, 3, -20, 16, 16, 45, 15, 15, 21, 21, -12, -12, -4, -4, -4, -39, -39, //
    -28, -28, -17, -17, 22, 22, 22, -13, -13, 15, 15, -11, -11, -52, -26, -26, -42, -42, -52, -49, //
    -49, -25, -25, 0, -6, -6, -48, -77, -77, -77, -51, -51, -12, -77, -77, -77, -7, -7, -7, -17, //
    -24, -24, -43, -45, -12, -78, -78, -78, -34, -73, -73, -43, -43, -43, -43, -112, -112, -112, -24, -24, //
    -24, -24, -24, -24, -24, -24, -24, -22, -22, -22, -27, -27, -24, -24, -53,
];

/// Gen-3-Zeichensatz (nicht japanisch) ab 0xA1; darunter nur Akzente, die deutsch kaum vorkommen.
const G3_CHARS: &str = "0123456789!?.-･…“”‘'♂♀$,×/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz►:ÄÖÜäöü";

fn u16_at(d: &[u8], o: usize) -> u16 {
    u16::from_le_bytes([d[o], d[o + 1]])
}

fn u32_at(d: &[u8], o: usize) -> u32 {
    u32::from_le_bytes([d[o], d[o + 1], d[o + 2], d[o + 3]])
}

fn checksum(d: &[u8]) -> u16 {
    d.chunks_exact(2).fold(0u16, |s, c| s.wrapping_add(u16::from_le_bytes([c[0], c[1]])))
}

fn wrong_game() -> String {
    "Spielstand passt nicht zum Spiel des Runs".into()
}

fn moves(d: &[u8]) -> Vec<u16> {
    (0..4).map(|i| u16_at(d, i * 2)).filter(|&m| m != 0).collect()
}

/// HP, Max-HP, Angr., Vert., Init., Sp.-Angr., Sp.-Vert. (Reihenfolge im Spiel)
fn party_stats(d: &[u8]) -> PartyStats {
    let s = |i: usize| u16_at(d, i * 2);
    PartyStats { hp: s(0), max_hp: s(1), atk: s(2), def: s(3), spe: s(4), spa: s(5), spd: s(6) }
}

/// Belegte Plätze einer Tasche aus [Item u16, Anzahl u16]-Paaren
fn pocket(id: &'static str, d: &[u8], key: u16) -> Pocket {
    let items = d
        .chunks_exact(4)
        .map(|c| [u16_at(c, 0), u16_at(c, 2) ^ key])
        .filter(|[item, _]| *item != 0)
        .collect();
    Pocket { id, items }
}

/// Spiel → Gen-3-Layout. Offsets im großen Block (Sektoren 1–4).
struct Gen3 {
    party: usize,
    /// Event-Flags; `badge` = Flag des ersten Ordens (8 aufeinanderfolgende)
    flags: usize,
    badge: usize,
    bag: usize,
    /// Offset des Item-Schlüssels im kleinen Block (Sektor 0); R/S verschlüsseln nicht
    key: Option<usize>,
    /// (Tasche, Offset ab `bag`, Plätze)
    pockets: &'static [(&'static str, usize, usize)],
}

const RS: Gen3 = Gen3 {
    party: 0x234,
    flags: 0x1220,
    badge: 0x807,
    bag: 0x498,
    key: None,
    pockets: &[("items", 0xC8, 20), ("keyItems", 0x118, 20), ("balls", 0x168, 16), ("tms", 0x1A8, 64), ("berries", 0x2A8, 46), ("pc", 0, 50)],
};

const E: Gen3 = Gen3 {
    party: 0x234,
    flags: 0x1270,
    badge: 0x867,
    bag: 0x498,
    key: Some(0xAC),
    pockets: &[("items", 0xC8, 30), ("keyItems", 0x140, 30), ("balls", 0x1B8, 16), ("tms", 0x1F8, 64), ("berries", 0x2F8, 46), ("pc", 0, 50)],
};

const FRLG: Gen3 = Gen3 {
    party: 0x34,
    flags: 0xEE0,
    badge: 0x820,
    bag: 0x298,
    key: Some(0xF20),
    pockets: &[("items", 0x78, 42), ("keyItems", 0x120, 30), ("balls", 0x198, 13), ("tms", 0x1CC, 58), ("berries", 0x2B4, 43), ("pc", 0, 30)],
};

pub fn parse(game_id: &str, data: &[u8]) -> Result<SaveData, String> {
    match game_id {
        "ruby" | "sapphire" => gen3(data, &RS),
        "emerald" => gen3(data, &E),
        "firered" | "leafgreen" => gen3(data, &FRLG),
        "black" | "white" => gen5(data, 0x21204),
        "black-2" | "white-2" => gen5(data, 0x21104),
        _ => Err("Spielstände werden für dieses Spiel noch nicht unterstützt".into()),
    }
}

const G3_SECTOR: usize = 0x1000;
const G3_USED: usize = 0xF80;
const G3_SLOT: usize = 14 * G3_SECTOR;

/// Alle 14 Sektoren eines Slots nach ID geordnet (je G3_USED Bytes), mit Speicherzähler.
fn gen3_slot(data: &[u8], slot: usize) -> Option<(u32, Vec<u8>)> {
    let sectors = data.get(slot * G3_SLOT..(slot + 1) * G3_SLOT)?;
    let mut seen = 0u16;
    let mut counter = 0;
    let mut blocks = vec![0; 14 * G3_USED];
    for s in sectors.chunks_exact(G3_SECTOR) {
        let id = usize::from(u16_at(s, 0xFF4));
        if id >= 14 {
            return None;
        }
        seen |= 1 << id;
        if id == 0 {
            counter = u32_at(s, 0xFFC);
        }
        blocks[id * G3_USED..(id + 1) * G3_USED].copy_from_slice(&s[..G3_USED]);
    }
    (seen == 0x3FFF).then_some((counter, blocks))
}

fn gen3(data: &[u8], g: &Gen3) -> Result<SaveData, String> {
    // Neuester vollständiger Slot; Zählerüberlauf ist praktisch ausgeschlossen.
    let blocks = [gen3_slot(data, 0), gen3_slot(data, 1)]
        .into_iter()
        .flatten()
        .max_by_key(|(counter, _)| *counter)
        .map(|(_, blocks)| blocks)
        .ok_or_else(wrong_game)?;
    let large = &blocks[G3_USED..5 * G3_USED];
    let storage = &blocks[5 * G3_USED..];
    let count = usize::from(large[g.party]);
    if count > 6 {
        return Err(wrong_game());
    }
    let team = large[g.party + 4..]
        .chunks_exact(100)
        .take(count)
        .filter_map(|m| {
            let mon = gen3_mon(m).transpose()?;
            Some(mon.map(|mon| Mon { level: Some(m[0x54]), stats: Some(party_stats(&m[0x56..])), ..mon }))
        })
        .collect::<Result<_, _>>()?;
    // Boxen: 14 × 30 Plätze ab 4, danach die Namen (je 9 Bytes). Defekte Plätze gelten als leer.
    let boxes = (0..14)
        .map(|b| BoxData {
            name: gen3_text(&storage[0x8344 + b * 9..][..9]),
            mons: storage[4 + b * 30 * 80..][..30 * 80].chunks_exact(80).map(|m| gen3_mon(m).ok().flatten()).collect(),
        })
        .collect();
    let key = g.key.map_or(0, |o| u16_at(&blocks, o));
    let bag = g
        .pockets
        .iter()
        .map(|&(id, ofs, slots)| pocket(id, &large[g.bag + ofs..][..slots * 4], if id == "pc" { 0 } else { key }))
        .collect();
    // u16, da die 8 Flags über eine Bytegrenze reichen können
    let bits = u16_at(large, g.flags + g.badge / 8) >> (g.badge % 8);
    Ok(SaveData { team, boxes, bag, badges: (bits & 0xFF) as u8 })
}

fn gen3_text(d: &[u8]) -> String {
    d.iter()
        .take_while(|&&b| b != 0xFF)
        .filter_map(|&b| match b {
            0x00 => Some(' '),
            0x15 => Some('ß'),
            0xA1..=0xFF => G3_CHARS.chars().nth(usize::from(b - 0xA1)),
            _ => None,
        })
        .collect()
}

/// Erste 80 Bytes (Box-Format); `None` = leer oder Ei.
fn gen3_mon(m: &[u8]) -> Result<Option<Mon>, String> {
    let m = &m[..80];
    if m.iter().all(|&b| b == 0) {
        return Ok(None);
    }
    let pid = u32_at(m, 0);
    let key = pid ^ u32_at(m, 4);
    let mut blocks = m[0x20..0x50].to_vec();
    for c in blocks.chunks_exact_mut(4) {
        c.copy_from_slice(&(u32_at(c, 0) ^ key).to_le_bytes());
    }
    if checksum(&blocks) != u16_at(m, 0x1C) {
        return Err(wrong_game());
    }
    let block = |i: usize| &blocks[usize::from(BLOCK_POSITION[(pid % 24) as usize * 4 + i]) * 12..][..12];
    let internal = u16_at(block(0), 0);
    if internal == 0 || (u32_at(block(3), 4) >> 30) & 1 == 1 {
        return Ok(None);
    }
    let species_id = match internal {
        1..=251 => internal,
        277..=411 => (i32::from(internal) + i32::from(G3_TO_NATIONAL[usize::from(internal - 277)])) as u16,
        _ => return Err(wrong_game()),
    };
    Ok(Some(Mon {
        species_id,
        nickname: Some(gen3_text(&m[0x08..0x12])),
        exp: u32_at(block(0), 4),
        item: u16_at(block(0), 2),
        moves: moves(block(1)),
        nature: (pid % 25) as u8,
        ivs: StatSet::ivs(u32_at(block(3), 4)),
        evs: StatSet::evs(block(2)),
        level: None,
        stats: None,
    }))
}

fn crypt5(d: &mut [u8], mut seed: u32) {
    for c in d.chunks_exact_mut(2) {
        seed = seed.wrapping_mul(0x41C6_4E6D).wrapping_add(0x6073);
        let x = u16_at(c, 0) ^ (seed >> 16) as u16;
        c.copy_from_slice(&x.to_le_bytes());
    }
}

fn utf16_text(d: &[u8]) -> String {
    let units = d.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]]));
    char::decode_utf16(units.take_while(|&u| u != 0xFFFF && u != 0))
        .filter_map(Result::ok)
        // DS speichert ♂/♀ als ⑭/⑮
        .map(|c| match c {
            '\u{246D}' => '♂',
            '\u{246E}' => '♀',
            c => c,
        })
        .collect()
}

/// (Tasche, Offset ab 0x18400, Plätze) – gleich in S/W und S2/W2
const G5_POCKETS: [(&str, usize, usize); 5] =
    [("items", 0, 310), ("keyItems", 0x4D8, 83), ("tms", 0x624, 109), ("medicine", 0x7D8, 48), ("berries", 0x898, 64)];

fn gen5(data: &[u8], badges: usize) -> Result<SaveData, String> {
    const PARTY: usize = 0x18E00;
    if data.len() < 0x80000 {
        return Err(wrong_game());
    }
    let count = usize::from(data[PARTY + 4]);
    if count > 6 {
        return Err(wrong_game());
    }
    let team = data[PARTY + 8..]
        .chunks_exact(220)
        .take(count)
        .filter_map(|m| {
            let mon = gen5_mon(m).transpose()?;
            let mut stats = m[0x88..0xDC].to_vec();
            crypt5(&mut stats, u32_at(m, 0));
            Some(mon.map(|mon| Mon { level: Some(stats[4]), stats: Some(party_stats(&stats[6..])), ..mon }))
        })
        .collect::<Result<_, _>>()?;
    // 24 Boxen à 30 × 136 Bytes + 0x10 ab 0x400; Namen im ersten Block (UTF-16, je 0x28 Bytes)
    let boxes = (0..24)
        .map(|b| BoxData {
            name: utf16_text(&data[4 + 0x28 * b..][..20]),
            mons: data[0x400 + b * (30 * 136 + 0x10)..][..30 * 136]
                .chunks_exact(136)
                .map(|m| gen5_mon(m).ok().flatten())
                .collect(),
        })
        .collect();
    let bag = G5_POCKETS.iter().map(|&(id, ofs, slots)| pocket(id, &data[0x18400 + ofs..][..slots * 4], 0)).collect();
    Ok(SaveData { team, boxes, bag, badges: data[badges] })
}

/// Erste 136 Bytes (Box-Format); `None` = leer oder Ei.
fn gen5_mon(m: &[u8]) -> Result<Option<Mon>, String> {
    let m = &m[..136];
    if m.iter().all(|&b| b == 0) {
        return Ok(None);
    }
    let pid = u32_at(m, 0);
    let chk = u16_at(m, 6);
    let mut blocks = m[0x08..0x88].to_vec();
    crypt5(&mut blocks, u32::from(chk));
    if checksum(&blocks) != chk {
        return Err(wrong_game());
    }
    let block = |i: usize| &blocks[usize::from(BLOCK_POSITION[((pid >> 13) & 31) as usize % 24 * 4 + i]) * 32..][..32];
    let ivs = u32_at(block(1), 0x10);
    let species_id = u16_at(block(0), 0);
    if species_id == 0 || (ivs >> 30) & 1 == 1 {
        return Ok(None);
    }
    if species_id > 649 {
        return Err(wrong_game());
    }
    Ok(Some(Mon {
        species_id,
        nickname: (ivs >> 31 == 1).then(|| utf16_text(&block(2)[..22])),
        exp: u32_at(block(0), 8),
        item: u16_at(block(0), 2),
        moves: moves(block(1)),
        nature: block(1)[0x19],
        ivs: StatSet::ivs(ivs),
        evs: StatSet::evs(&block(0)[0x10..]),
        level: None,
        stats: None,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Logische Blöcke (je `size` Bytes) in gespeicherte Reihenfolge bringen.
    fn shuffle(logical: &[u8], sv: usize, size: usize) -> Vec<u8> {
        let mut out = vec![0; logical.len()];
        for i in 0..4 {
            let pos = usize::from(BLOCK_POSITION[sv * 4 + i]);
            out[pos * size..(pos + 1) * size].copy_from_slice(&logical[i * size..(i + 1) * size]);
        }
        out
    }

    fn summary(mons: &[Mon]) -> Vec<(u16, Option<&str>, Option<u8>)> {
        mons.iter().map(|m| (m.species_id, m.nickname.as_deref(), m.level)).collect()
    }

    fn g3_mon(pid: u32, internal: u16, level: u8, egg: bool) -> Vec<u8> {
        let mut logical = vec![0u8; 48];
        logical[0..2].copy_from_slice(&internal.to_le_bytes());
        logical[2..4].copy_from_slice(&13u16.to_le_bytes());
        logical[4..8].copy_from_slice(&1234u32.to_le_bytes());
        logical[12..14].copy_from_slice(&33u16.to_le_bytes());
        if egg {
            logical[36 + 4..36 + 8].copy_from_slice(&(1u32 << 30).to_le_bytes());
        }
        let mut m = vec![0u8; 100];
        m[0..4].copy_from_slice(&pid.to_le_bytes());
        m[4..8].copy_from_slice(&0x1234_5678u32.to_le_bytes());
        m[0x08..0x12].copy_from_slice(&[0xC6, 0xDD, 0xE7, 0xF6, 0xD5, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]); // "Lisüa"
        m[0x1C..0x1E].copy_from_slice(&checksum(&logical).to_le_bytes());
        m[0x54] = level;
        m[0x58..0x5A].copy_from_slice(&40u16.to_le_bytes());
        let mut stored = shuffle(&logical, (pid % 24) as usize, 12);
        for c in stored.chunks_exact_mut(4) {
            c.copy_from_slice(&(u32_at(c, 0) ^ pid ^ 0x1234_5678).to_le_bytes());
        }
        m[0x20..0x50].copy_from_slice(&stored);
        m
    }

    fn g3_save(counter0: u32, counter1: u32, mons: &[Vec<u8>]) -> Vec<u8> {
        let mut d = vec![0u8; 2 * G3_SLOT];
        for (slot, counter) in [counter0, counter1].into_iter().enumerate() {
            for i in 0..14 {
                // Sektoren rotiert ablegen wie im Spiel
                let id = (i + 3) % 14;
                let s = &mut d[slot * G3_SLOT + i * G3_SECTOR..][..G3_SECTOR];
                s[0xFF4..0xFF6].copy_from_slice(&(id as u16).to_le_bytes());
                s[0xFFC..0x1000].copy_from_slice(&counter.to_le_bytes());
                match id {
                    0 => s[0xF20..0xF24].copy_from_slice(&0xABCD_0F0Fu32.to_le_bytes()),
                    1 if counter == counter0.max(counter1) => {
                        s[0x34] = mons.len() as u8;
                        for (j, m) in mons.iter().enumerate() {
                            s[0x38 + j * 100..0x38 + (j + 1) * 100].copy_from_slice(m);
                        }
                        // Tasche „items“: Trank × 3, Anzahl mit dem Schlüssel verschlüsselt
                        s[0x298 + 0x78..0x298 + 0x7C].copy_from_slice(&[13, 0, 3 ^ 0x0F, 0x0F]);
                    }
                    2 => s[0xEE0 + 0x104 - G3_USED] = 0b0000_0101, // Orden 1 und 3
                    // Box 1, Platz 2
                    5 => s[4 + 80..4 + 160].copy_from_slice(&mons[0][..80]),
                    _ => {}
                }
            }
        }
        d
    }

    #[test]
    fn gen3_frlg() {
        let mons = [g3_mon(7, 25, 12, false), g3_mon(123_456, 280, 50, false), g3_mon(5, 1, 1, true)];
        for (a, b) in [(4, 9), (9, 4)] {
            let s = parse("firered", &g3_save(a, b, &mons)).unwrap();
            assert_eq!(s.badges, 0b101);
            // intern 280 = Nationaldex 255 (Flemmli)
            assert_eq!(summary(&s.team), [(25, Some("Lisüa"), Some(12)), (255, Some("Lisüa"), Some(50))]);
            assert_eq!((s.team[0].item, s.team[0].exp, &s.team[0].moves), (13, 1234, &vec![33]));
            assert_eq!(s.team[0].stats.as_ref().map(|st| st.max_hp), Some(40));
            assert_eq!(s.bag[0], Pocket { id: "items", items: vec![[13, 3]] });
            assert_eq!(s.boxes.len(), 14);
            let first = &s.boxes[0].mons;
            assert_eq!((first.len(), first[0].is_none(), first[1].as_ref().map(|m| (m.species_id, m.level))), (30, true, Some((25, None))));
        }
        assert!(parse("firered", &[0; 0x20000]).is_err());
        let mut bad = g3_save(1, 0, &mons);
        bad[12 * G3_SECTOR + 0x38 + 0x30] ^= 1; // Sektor 1 liegt rotiert an Position 12
        assert!(parse("firered", &bad).is_err());
    }

    fn g5_mon(pid: u32, species: u16, level: u8, nick: Option<&str>) -> Vec<u8> {
        let mut logical = vec![0u8; 128];
        logical[0..2].copy_from_slice(&species.to_le_bytes());
        logical[0x20..0x22].copy_from_slice(&15u16.to_le_bytes());
        let ivs: u32 = if nick.is_some() { 1 << 31 } else { 0 };
        logical[0x30..0x34].copy_from_slice(&ivs.to_le_bytes());
        logical[0x40..0x56].fill(0xFF);
        for (i, u) in nick.unwrap_or("").replace('♀', "\u{246E}").encode_utf16().enumerate() {
            logical[0x40 + i * 2..0x42 + i * 2].copy_from_slice(&u.to_le_bytes());
        }
        let chk = checksum(&logical);
        let mut stored = shuffle(&logical, ((pid >> 13) & 31) as usize % 24, 32);
        crypt5(&mut stored, u32::from(chk));
        let mut stats = vec![0u8; 0x54];
        stats[4] = level;
        stats[0x10..0x12].copy_from_slice(&99u16.to_le_bytes());
        crypt5(&mut stats, pid);
        let mut m = vec![0u8; 220];
        m[0..4].copy_from_slice(&pid.to_le_bytes());
        m[6..8].copy_from_slice(&chk.to_le_bytes());
        m[0x08..0x88].copy_from_slice(&stored);
        m[0x88..].copy_from_slice(&stats);
        m
    }

    #[test]
    fn gen5_b2w2() {
        let mut d = vec![0u8; 0x80000 + 122];
        let mons = [g5_mon(0xDEAD_BEEF, 495, 5, None), g5_mon(0x0003_E000, 571, 42, Some("Zoroark♀"))];
        d[0x18E04] = 2;
        for (i, m) in mons.iter().enumerate() {
            d[0x18E08 + i * 220..0x18E08 + (i + 1) * 220].copy_from_slice(m);
        }
        d[0x21104] = 0xFF;
        // Box 2, Platz 1; Medizin-Tasche: Trank × 7
        let box2 = 0x400 + 30 * 136 + 0x10;
        d[box2..box2 + 136].copy_from_slice(&mons[1][..136]);
        d[0x18400 + 0x7D8..0x18400 + 0x7DC].copy_from_slice(&[17, 0, 7, 0]);
        let s = parse("white-2", &d).unwrap();
        assert_eq!(s.badges, 0xFF);
        assert_eq!(summary(&s.team), [(495, None, Some(5)), (571, Some("Zoroark♀"), Some(42))]);
        assert_eq!((s.team[1].stats.as_ref().map(|st| st.spa), &s.team[1].moves), (Some(99), &vec![15]));
        assert_eq!(s.boxes.len(), 24);
        assert_eq!(s.boxes[1].mons[0].as_ref().map(|m| (m.species_id, m.level)), Some((571, None)));
        assert!(s.boxes[0].mons.iter().all(Option::is_none));
        assert_eq!(s.bag[3], Pocket { id: "medicine", items: vec![[17, 7]] });
        assert_eq!(parse("black", &d).unwrap().badges, 0);
        assert!(parse("black", &d[..0x40000]).is_err());
        assert!(parse("x", &d).is_err());
    }
}
