//! Liest Team, Boxen, Beutel, Orden, Pokédex und Trainerdaten aus Spielständen (Gen 1–5).
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
    /// Wesen-Nummer im Spiel (0–24); Gen 1/2 kennen keine Wesen
    #[serde(skip_serializing_if = "Option::is_none")]
    nature: Option<u8>,
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
/// IVs/EVs; Gen 1/2: DVs (0–15) und Stat-EXP (bis 65535), Spezial in spa und spd
pub struct StatSet {
    hp: u16,
    atk: u16,
    def: u16,
    spa: u16,
    spd: u16,
    spe: u16,
}

impl StatSet {
    /// Spielreihenfolge: KP, Angr., Vert., Init., Sp.-Angr., Sp.-Vert.
    fn from_game([hp, atk, def, spe, spa, spd]: [u16; 6]) -> Self {
        StatSet { hp, atk, def, spa, spd, spe }
    }

    fn evs(d: &[u8]) -> Self {
        Self::from_game([0, 1, 2, 3, 4, 5].map(|i| u16::from(d[i])))
    }

    /// 6 × 5 Bit ab Bit 0
    fn ivs(packed: u32) -> Self {
        Self::from_game([0, 5, 10, 15, 20, 25].map(|shift| ((packed >> shift) & 31) as u16))
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
    badges: u16,
    /// Im Pokédex als gefangen markierte Nationaldex-Nummern
    caught: Vec<u16>,
    /// Name des Spielers
    trainer: String,
    money: u32,
    /// Spielzeit [Stunden, Minuten, Sekunden]
    played: [u16; 3],
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

/// Pokédex-Bitfeld (Bit i = Nationaldex-Nr. i + 1) → gesetzte Nummern bis `max`
fn dex_flags(d: &[u8], max: u16) -> Vec<u16> {
    (1..=max)
        .filter(|&n| {
            let bit = usize::from(n - 1);
            d[bit / 8] >> (bit % 8) & 1 == 1
        })
        .collect()
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
        .filter(|&[item, count]| item != 0 && count != 0)
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
    money: usize,
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
    money: 0x490,
    key: None,
    pockets: &[("items", 0xC8, 20), ("keyItems", 0x118, 20), ("balls", 0x168, 16), ("tms", 0x1A8, 64), ("berries", 0x2A8, 46), ("pc", 0, 50)],
};

const E: Gen3 = Gen3 {
    party: 0x234,
    flags: 0x1270,
    badge: 0x867,
    bag: 0x498,
    money: 0x490,
    key: Some(0xAC),
    pockets: &[("items", 0xC8, 30), ("keyItems", 0x140, 30), ("balls", 0x1B8, 16), ("tms", 0x1F8, 64), ("berries", 0x2F8, 46), ("pc", 0, 50)],
};

const FRLG: Gen3 = Gen3 {
    party: 0x34,
    flags: 0xEE0,
    badge: 0x820,
    bag: 0x298,
    money: 0x290,
    key: Some(0xF20),
    pockets: &[("items", 0x78, 42), ("keyItems", 0x120, 30), ("balls", 0x198, 13), ("tms", 0x1CC, 58), ("berries", 0x2B4, 43), ("pc", 0, 30)],
};

/// Gen-1-Artnummer (intern) → Nationaldex-Nr.; 0 = ungültig
const G1_TO_NATIONAL: [u8; 191] = [0, 112, 115, 32, 35, 21, 100, 34, 80, 2, 103, 108, 102, 88, 94, 29, 31, 104, 111, 131, 59, 151, 130, 90, 72, 92, 123, 120, 9, 127, 114, 0, 0, 58, 95, 22, 16, 79, 64, 75, 113, 67, 122, 106, 107, 24, 47, 54, 96, 76, 0, 126, 0, 125, 82, 109, 0, 56, 86, 50, 128, 0, 0, 0, 83, 48, 149, 0, 0, 0, 84, 60, 124, 146, 144, 145, 132, 52, 98, 0, 0, 0, 37, 38, 25, 26, 0, 0, 147, 148, 140, 141, 116, 117, 0, 0, 27, 28, 138, 139, 39, 40, 133, 136, 135, 134, 66, 41, 23, 46, 61, 62, 13, 14, 15, 0, 85, 57, 51, 49, 87, 0, 0, 10, 11, 12, 68, 0, 55, 97, 42, 150, 143, 129, 0, 0, 89, 0, 99, 91, 0, 101, 36, 110, 53, 105, 0, 93, 63, 65, 17, 18, 121, 1, 3, 73, 0, 118, 119, 0, 0, 0, 0, 77, 78, 19, 20, 33, 30, 74, 137, 142, 0, 81, 0, 0, 4, 7, 5, 8, 6, 0, 0, 0, 0, 43, 44, 45, 69, 70, 71];

/// Deutsche Zeichensätze ab 0x80 (Gen 1, Gen 2); 0x50 beendet, 0x7F = Leerzeichen, \0 = nicht darstellbar
const G1_CHARS: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ():;[]abcdefghijklmnopqrstuvwxyzàèéùÀÁÄÖÜäöüÈÉÌÍÑÒÓÙÚáìíñòóúº\0\0\0\0\0\0\0←'’\0\0-\0\0?!.&é→▷▶▼♂¥×./,♀0123456789";
const G2_CHARS: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ():;[]abcdefghijklmnopqrstuvwxyzàèéùßçÄÖÜäöüëïâôûêîÙÚá\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0’\0\0-+\0?!.&é→▷▶▼♂¥×./,♀0123456789";

fn gb_text(d: &[u8], chars: &str) -> String {
    d.iter()
        .take_while(|&&b| b != 0x50)
        .filter_map(|&b| match b {
            0x7F => Some(' '),
            0x80.. => chars.chars().nth(usize::from(b - 0x80)).filter(|&c| c != '\0'),
            _ => None,
        })
        .collect()
}

fn u16_be(d: &[u8], o: usize) -> u16 {
    u16::from_be_bytes([d[o], d[o + 1]])
}

fn u24_be(d: &[u8], o: usize) -> u32 {
    u32::from_be_bytes([0, d[o], d[o + 1], d[o + 2]])
}

/// Gen-1/2-Pokémon (Box- oder Team-Format) mit Spitzname aus der Liste; `None` = ungültige Art
fn gb_mon(m: &[u8], nickname: &[u8], gen: u8, party: bool) -> Option<Mon> {
    let g1 = gen == 1;
    let species_id = if g1 { u16::from(*G1_TO_NATIONAL.get(usize::from(m[0]))?) } else { u16::from(m[0]) };
    if species_id == 0 || species_id > 251 {
        return None;
    }
    // Gen 1 hat vor den Gen-2-Feldern KP, Status und Typen; Spezial gilt für Sp.-Angr. und Sp.-Vert.
    let (moves, exp, ev, dv, box_level) = if g1 { (8, 0x0E, 0x11, 0x1B, 3) } else { (2, 0x08, 0x0B, 0x15, 0x1F) };
    let dvs = u16_be(m, dv);
    let [atk, def, spe, spc] = [12, 8, 4, 0].map(|shift| (dvs >> shift) & 15);
    let hp = (atk & 1) << 3 | (def & 1) << 2 | (spe & 1) << 1 | (spc & 1);
    let evs = [0, 1, 2, 3, 4].map(|i| u16_be(m, ev + i * 2));
    let stats = party.then(|| {
        let s = |o: usize| u16_be(m, o);
        if g1 {
            PartyStats { hp: s(1), max_hp: s(0x22), atk: s(0x24), def: s(0x26), spe: s(0x28), spa: s(0x2A), spd: s(0x2A) }
        } else {
            PartyStats { hp: s(0x22), max_hp: s(0x24), atk: s(0x26), def: s(0x28), spe: s(0x2A), spa: s(0x2C), spd: s(0x2E) }
        }
    });
    Some(Mon {
        species_id,
        nickname: Some(gb_text(nickname, if g1 { G1_CHARS } else { G2_CHARS })),
        exp: u24_be(m, exp),
        // Gen 1 hat an dieser Stelle die Fangrate statt eines Items
        item: if g1 { 0 } else { u16::from(m[1]) },
        moves: m[moves..moves + 4].iter().filter(|&&mv| mv != 0).map(|&mv| u16::from(mv)).collect(),
        nature: None,
        ivs: StatSet { hp, atk, def, spa: spc, spd: spc, spe },
        evs: StatSet { hp: evs[0], atk: evs[1], def: evs[2], spa: evs[4], spd: evs[4], spe: evs[3] },
        level: Some(m[if party && g1 { 0x21 } else { box_level }]),
        stats,
    })
}

/// Gen-1/2-Liste: Anzahl, Artenliste (Plätze + Ende), Daten, OT-Namen, Spitznamen (je 11 Bytes).
/// Eier (0xFD in der Artenliste) und ungültige Plätze sind `None`.
fn gb_list(d: &[u8], slots: usize, size: usize, gen: u8, party: bool) -> Result<Vec<Option<Mon>>, String> {
    let count = usize::from(d[0]);
    if count > slots {
        return Err(wrong_game());
    }
    let body = 2 + slots;
    let nicks = body + slots * (size + 11);
    Ok((0..count)
        .map(|i| (d[1 + i] != 0xFD).then(|| gb_mon(&d[body + i * size..][..size], &d[nicks + i * 11..][..11], gen, party)).flatten())
        .collect())
}

/// Gen-1/2-Tasche: Anzahl, dann [Item, Anzahl]-Paare (Basis-Items in Gen 2 ohne Anzahl)
fn gb_pocket(id: &'static str, d: &[u8], slots: usize) -> Pocket {
    let count = if usize::from(d[0]) > slots { 0 } else { usize::from(d[0]) };
    let items = if id == "keyItems" {
        d[1..=count].iter().map(|&i| [u16::from(i), 1]).collect()
    } else {
        d[1..1 + count * 2].chunks_exact(2).map(|c| [u16::from(c[0]), u16::from(c[1])]).filter(|[_, n]| *n != 0).collect()
    };
    Pocket { id, items }
}

/// Gen-1-Geld: 3 Bytes BCD
fn bcd(d: &[u8]) -> u32 {
    d.iter().fold(0, |n, &b| n * 100 + u32::from(b >> 4) * 10 + u32::from(b & 15))
}

fn gen1(data: &[u8]) -> Result<SaveData, String> {
    if data.len() < 0x8000 {
        return Err(wrong_game());
    }
    let team = gb_list(&data[0x2F2C..], 6, 44, 1, true)?.into_iter().flatten().collect();
    // Die aktuelle Box liegt in einer Arbeitskopie; die übrigen Boxen erst, wenn einmal gewechselt wurde (Bit 7).
    let current = usize::from(data[0x284C] & 0x7F);
    let initialized = data[0x284C] & 0x80 != 0;
    let boxes = (0..12)
        .map(|b| {
            let ofs = if b == current { 0x30C0 } else if b < 6 { 0x4000 + b * 0x462 } else { 0x6000 + (b - 6) * 0x462 };
            let mut mons = if b == current || initialized { gb_list(&data[ofs..], 20, 33, 1, false).unwrap_or_default() } else { vec![] };
            mons.resize_with(20, || None);
            BoxData { name: String::new(), mons }
        })
        .collect();
    Ok(SaveData {
        team,
        boxes,
        bag: vec![gb_pocket("items", &data[0x25C9..], 20), gb_pocket("pc", &data[0x27E6..], 50)],
        badges: u16::from(data[0x2602]),
        caught: dex_flags(&data[0x25A3..], 151),
        trainer: gb_text(&data[0x2598..][..11], G1_CHARS),
        money: bcd(&data[0x25F3..][..3]),
        played: [u16::from(data[0x2CED]), u16::from(data[0x2CEF]), u16::from(data[0x2CF0])],
    })
}

/// Gen-2-Offsets (Gold/Silber bzw. Kristall, international)
struct Gen2 {
    time: usize,
    money: usize,
    badges: usize,
    box_names: usize,
    party: usize,
    dex: usize,
    /// TM/VM-Zähler, Items, Basis-Items, Bälle, PC
    pockets: [usize; 5],
}

const GS: Gen2 = Gen2 {
    time: 0x2053,
    money: 0x23DB,
    badges: 0x23E4,
    box_names: 0x2727,
    party: 0x288A,
    dex: 0x2A4C,
    pockets: [0x23E6, 0x241F, 0x2449, 0x2464, 0x247E],
};

const C: Gen2 = Gen2 {
    time: 0x2052,
    money: 0x23DC,
    badges: 0x23E5,
    box_names: 0x2703,
    party: 0x2865,
    dex: 0x2A27,
    pockets: [0x23E7, 0x2420, 0x244A, 0x2465, 0x247F],
};

/// Item-Nummern der 57 TM/VM-Zähler in Gen 2 (nach TM04 und nach TM28 fehlt je eine Nummer)
fn g2_machine(i: usize) -> u16 {
    let n = 191 + i as u16;
    n + u16::from(n >= 195) + u16::from(n >= 219)
}

fn gen2(data: &[u8], g: &Gen2) -> Result<SaveData, String> {
    if data.len() < 0x8000 {
        return Err(wrong_game());
    }
    let team = gb_list(&data[g.party..], 6, 48, 2, true)?.into_iter().flatten().collect();
    // Laut PKHeX sind die Box-Bänke maßgeblich, nicht die Arbeitskopie der aktuellen Box
    let boxes = (0..14)
        .map(|b| {
            let ofs = if b < 7 { 0x4000 + b * 0x450 } else { 0x6000 + (b - 7) * 0x450 };
            let mut mons = gb_list(&data[ofs..], 20, 32, 2, false).unwrap_or_default();
            mons.resize_with(20, || None);
            BoxData { name: gb_text(&data[g.box_names + b * 9..][..9], G2_CHARS), mons }
        })
        .collect();
    let [tms, items, key, balls, pc] = g.pockets;
    let machines = data[tms..tms + 57]
        .iter()
        .enumerate()
        .filter(|(_, &n)| n != 0)
        .map(|(i, &n)| [g2_machine(i), u16::from(n)])
        .collect();
    Ok(SaveData {
        team,
        boxes,
        bag: vec![
            gb_pocket("items", &data[items..], 20),
            gb_pocket("keyItems", &data[key..], 26),
            gb_pocket("balls", &data[balls..], 12),
            Pocket { id: "tms", items: machines },
            gb_pocket("pc", &data[pc..], 50),
        ],
        badges: u16::from_le_bytes([data[g.badges], data[g.badges + 1]]),
        caught: dex_flags(&data[g.dex..], 251),
        trainer: gb_text(&data[0x200B..][..11], G2_CHARS),
        money: u24_be(data, g.money),
        played: [u16_be(data, g.time), u16::from(data[g.time + 2]), u16::from(data[g.time + 3])],
    })
}

pub fn parse(game_id: &str, data: &[u8]) -> Result<SaveData, String> {
    // Nie gespeichert: Emulatoren legen die Datei voller 0x00 bzw. 0xFF an
    if data.iter().all(|&b| b == data[0]) {
        return Err("Der Spielstand ist leer, im Spiel wurde noch nicht gespeichert".into());
    }
    match game_id {
        "red" | "blue" | "yellow" => gen1(data),
        "gold" | "silver" => gen2(data, &GS),
        "crystal" => gen2(data, &C),
        "ruby" | "sapphire" => gen3(data, &RS),
        "emerald" => gen3(data, &E),
        "firered" | "leafgreen" => gen3(data, &FRLG),
        "diamond" | "pearl" => gen4(data, &DP),
        "platinum" => gen4(data, &PT),
        "heartgold" | "soulsilver" => gen4(data, &HGSS),
        "black" | "white" => gen5(data, 0x21200, 0x21600),
        "black-2" | "white-2" => gen5(data, 0x21100, 0x21400),
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
    // Kleiner Block (Sektor 0): Name ab 0, Spielzeit ab 0x0E, Gefangen-Flags ab 0x28.
    // Geld ist mit demselben Schlüssel verschlüsselt wie die Item-Anzahlen, aber als u32.
    let money = u32_at(large, g.money) ^ g.key.map_or(0, |o| u32_at(&blocks, o));
    Ok(SaveData {
        team,
        boxes,
        bag,
        badges: bits & 0xFF,
        caught: dex_flags(&blocks[0x28..], 386),
        trainer: gen3_text(&blocks[..8]),
        money,
        played: [u16_at(&blocks, 0x0E), u16::from(blocks[0x10]), u16::from(blocks[0x11])],
    })
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
        nature: Some((pid % 25) as u8),
        ivs: StatSet::ivs(u32_at(block(3), 4)),
        evs: StatSet::evs(block(2)),
        level: None,
        stats: None,
    }))
}

/// Gen-4-Zeichensatz (international), Index = Zeichencode; U+FFFF = unbelegt
const G4_CHARS: &str = "\u{FFFF}\u{3000}ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをんァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲン０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ\u{FFFF}！？、。…・／「」『』（）♂♀＋ー×÷＝～：；．，♠♣♥♦★◎○□△◇＠♪％☀☁☂☃①②③④⑤⑥⑦円♈♉♊♋♌♍♎♏←↑↓→►＆0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ⑧ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö⑨øùúûüýþÿŒœŞşªº⑩⑪⑫$¡¿!?,.⑬･/‘'“”„«»()♂♀+-*#=&~:;⑯⑰⑱⑲⑳⑴⑵⑶⑷⑸@⑹%⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄\u{20}⒅⒆⒇⒈⒉⒊⒋⒌⒍°_＿⒎⒏";

fn gen4_text(d: &[u8]) -> String {
    d.chunks_exact(2)
        .map(|c| u16::from_le_bytes([c[0], c[1]]))
        .take_while(|&u| u != 0xFFFF)
        .filter_map(|u| G4_CHARS.chars().nth(usize::from(u)).filter(|&c| c != '\u{FFFF}'))
        .collect()
}

/// Spiel → Gen-4-Layout. Zwei Partitionen à 0x40000, je ein allgemeiner und ein Box-Block mit Footer.
struct Gen4 {
    general: usize,
    storage: usize,
    storage_size: usize,
    /// Offsets im allgemeinen Block
    trainer: usize,
    party: usize,
    dex: usize,
    bag: usize,
    pockets: &'static [(&'static str, usize, usize)],
    /// Offsets im Box-Block: erste Box, Abstand der Boxen, Boxnamen
    boxes: usize,
    box_stride: usize,
    box_names: usize,
    /// Kanto-Orden (HG/SS) als zweites Byte
    kanto: Option<usize>,
}

const G4_SINNOH_POCKETS: [(&str, usize, usize); 8] = [
    ("items", 0, 165),
    ("keyItems", 0x294, 50),
    ("tms", 0x35C, 100),
    ("mail", 0x4EC, 12),
    ("medicine", 0x51C, 40),
    ("berries", 0x5BC, 64),
    ("balls", 0x6BC, 15),
    ("battle", 0x6F8, 13),
];

const DP: Gen4 = Gen4 {
    general: 0xC100,
    storage: 0xC100,
    storage_size: 0x121E0,
    trainer: 0x64,
    party: 0x98,
    dex: 0x12DC,
    bag: 0x624,
    pockets: &G4_SINNOH_POCKETS,
    boxes: 4,
    box_stride: 0xFF0,
    box_names: 4 + 18 * 0xFF0,
    kanto: None,
};

const PT: Gen4 = Gen4 {
    general: 0xCF2C,
    storage: 0xCF2C,
    storage_size: 0x121E4,
    trainer: 0x68,
    party: 0xA0,
    dex: 0x1328,
    bag: 0x630,
    pockets: &G4_SINNOH_POCKETS,
    boxes: 4,
    box_stride: 0xFF0,
    box_names: 4 + 18 * 0xFF0,
    kanto: None,
};

const HGSS: Gen4 = Gen4 {
    general: 0xF628,
    storage: 0xF700,
    storage_size: 0x12310,
    trainer: 0x64,
    party: 0x98,
    dex: 0x12B8,
    bag: 0x644,
    pockets: &[
        ("items", 0, 165),
        ("keyItems", 0x294, 50),
        ("tms", 0x35C, 101),
        ("mail", 0x4F0, 12),
        ("medicine", 0x520, 40),
        ("berries", 0x5C0, 64),
        ("balls", 0x6C0, 24),
        ("battle", 0x720, 13),
    ],
    boxes: 0,
    box_stride: 0x1000,
    box_names: 0x12008,
    kanto: Some(0x1F),
};

const G4_PARTITION: usize = 0x40000;

/// Neuere der beiden Kopien eines Blocks (Footer: Speicherzähler groß/klein, 0xFFFFFFFF = nie geschrieben).
fn gen4_block(data: &[u8], start: usize, size: usize) -> &[u8] {
    let counters = |o: usize| {
        let footer = o + size - 0x14;
        let major = u32_at(data, footer);
        (major != u32::MAX, major, u32_at(data, footer + 4))
    };
    let start = if counters(start + G4_PARTITION) > counters(start) { start + G4_PARTITION } else { start };
    &data[start..start + size]
}

fn gen4(data: &[u8], g: &Gen4) -> Result<SaveData, String> {
    if data.len() < 2 * G4_PARTITION {
        return Err(wrong_game());
    }
    let general = gen4_block(data, 0, g.general);
    let storage = gen4_block(data, g.storage, g.storage_size);
    let count = usize::from(general[g.party - 4]);
    if count > 6 {
        return Err(wrong_game());
    }
    let team = general[g.party..]
        .chunks_exact(236)
        .take(count)
        .map(|m| pk45_party(m, 4))
        .filter_map(Result::transpose)
        .collect::<Result<_, _>>()?;
    let boxes = (0..18)
        .map(|b| BoxData {
            name: gen4_text(&storage[g.box_names + b * 40..][..40]),
            mons: storage[g.boxes + b * g.box_stride..][..30 * 136]
                .chunks_exact(136)
                .map(|m| pk45_mon(m, 4).ok().flatten())
                .collect(),
        })
        .collect();
    let bag = g.pockets.iter().map(|&(id, ofs, slots)| pocket(id, &general[g.bag + ofs..][..slots * 4], 0)).collect();
    let t = &general[g.trainer..];
    let kanto = g.kanto.map_or(0, |o| u16::from(t[o]));
    Ok(SaveData {
        team,
        boxes,
        bag,
        badges: u16::from(t[0x1A]) | kanto << 8,
        caught: dex_flags(&general[g.dex + 4..], 493),
        trainer: gen4_text(&t[..16]),
        money: u32_at(t, 0x14),
        played: [u16_at(t, 0x22), u16::from(t[0x24]), u16::from(t[0x25])],
    })
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

/// `misc`: Block mit Geld (+0) und Orden-Flags (+4), `dex`: Pokédex-Block (Gefangen-Flags ab +8)
fn gen5(data: &[u8], misc: usize, dex: usize) -> Result<SaveData, String> {
    const TRAINER: usize = 0x19400;
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
        .map(|m| pk45_party(m, 5))
        .filter_map(Result::transpose)
        .collect::<Result<_, _>>()?;
    // 24 Boxen à 30 × 136 Bytes + 0x10 ab 0x400; Namen im ersten Block (UTF-16, je 0x28 Bytes)
    let boxes = (0..24)
        .map(|b| BoxData {
            name: utf16_text(&data[4 + 0x28 * b..][..20]),
            mons: data[0x400 + b * (30 * 136 + 0x10)..][..30 * 136]
                .chunks_exact(136)
                .map(|m| pk45_mon(m, 5).ok().flatten())
                .collect(),
        })
        .collect();
    let bag = G5_POCKETS.iter().map(|&(id, ofs, slots)| pocket(id, &data[0x18400 + ofs..][..slots * 4], 0)).collect();
    Ok(SaveData {
        team,
        boxes,
        bag,
        badges: u16::from(data[misc + 4]),
        caught: dex_flags(&data[dex + 8..], 649),
        trainer: utf16_text(&data[TRAINER + 4..][..16]),
        money: u32_at(data, misc),
        played: [u16_at(data, TRAINER + 0x24), u16::from(data[TRAINER + 0x26]), u16::from(data[TRAINER + 0x27])],
    })
}

/// Team-Pokémon (Gen 4: 236, Gen 5: 220 Bytes): Box-Daten plus mit der PID verschlüsselte Werte ab 0x88.
fn pk45_party(m: &[u8], gen: u8) -> Result<Option<Mon>, String> {
    let Some(mon) = pk45_mon(m, gen)? else { return Ok(None) };
    let mut stats = m[0x88..0xDC].to_vec();
    crypt5(&mut stats, u32_at(m, 0));
    Ok(Some(Mon { level: Some(stats[4]), stats: Some(party_stats(&stats[6..])), ..mon }))
}

/// Erste 136 Bytes (Box-Format, Gen 4 und 5); `None` = leer oder Ei.
fn pk45_mon(m: &[u8], gen: u8) -> Result<Option<Mon>, String> {
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
    if species_id > if gen == 4 { 493 } else { 649 } {
        return Err(wrong_game());
    }
    let nick = &block(2)[..22];
    Ok(Some(Mon {
        species_id,
        nickname: (ivs >> 31 == 1).then(|| if gen == 4 { gen4_text(nick) } else { utf16_text(nick) }),
        exp: u32_at(block(0), 8),
        item: u16_at(block(0), 2),
        moves: moves(block(1)),
        // Gen 4 leitet das Wesen aus der PID ab, Gen 5 speichert es
        nature: Some(if gen == 4 { (pid % 25) as u8 } else { block(1)[0x19] }),
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
                    0 => {
                        s[0xF20..0xF24].copy_from_slice(&0xABCD_0F0Fu32.to_le_bytes());
                        // Pokédex: Bisasam (1) und Raichu (26) gefangen
                        s[0x28] = 1;
                        s[0x28 + 3] = 0b10;
                        // Name „Rot“, Spielzeit 12:34:56
                        s[..4].copy_from_slice(&[0xCC, 0xE3, 0xE8, 0xFF]);
                        s[0x0E..0x12].copy_from_slice(&[12, 0, 34, 56]);
                    }
                    1 if counter == counter0.max(counter1) => {
                        s[0x34] = mons.len() as u8;
                        for (j, m) in mons.iter().enumerate() {
                            s[0x38 + j * 100..0x38 + (j + 1) * 100].copy_from_slice(m);
                        }
                        // 3000 Geld, mit dem Schlüssel verschlüsselt
                        s[0x290..0x294].copy_from_slice(&(3000u32 ^ 0xABCD_0F0F).to_le_bytes());
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
            assert_eq!(s.caught, [1, 26]);
            assert_eq!((s.trainer.as_str(), s.money, s.played), ("Rot", 3000, [12, 34, 56]));
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

    #[test]
    fn gen4_hgss() {
        let mut d = vec![0u8; 2 * G4_PARTITION];
        // Partition 2 ist neuer (Footer-Zähler 5 > 4) und enthält die echten Daten
        for (base, counter) in [(0, 4u32), (G4_PARTITION, 5)] {
            d[base + HGSS.general - 0x14..][..4].copy_from_slice(&counter.to_le_bytes());
            d[base + HGSS.storage + HGSS.storage_size - 0x14..][..4].copy_from_slice(&counter.to_le_bytes());
        }
        let g = G4_PARTITION;
        let mut mon = g5_mon(0x0003_E000, 155, 7, None);
        mon.resize(236, 0);
        d[g + HGSS.party - 4] = 1;
        d[g + HGSS.party..][..236].copy_from_slice(&mon);
        let t = g + HGSS.trainer;
        // Name „Lyra“ im Gen-4-Zeichensatz (L = 0x136, y = 0x15D, r = 0x156, a = 0x145)
        for (i, c) in [0x136u16, 0x15D, 0x156, 0x145, 0xFFFF].into_iter().enumerate() {
            d[t + i * 2..][..2].copy_from_slice(&c.to_le_bytes());
        }
        d[t + 0x14..][..4].copy_from_slice(&3000u32.to_le_bytes());
        d[t + 0x1A] = 0b11; // Johto: Flügel- und Insektorden
        d[t + 0x1F] = 1; // Kanto: Felsorden
        d[t + 0x22..][..4].copy_from_slice(&[5, 0, 6, 7]);
        d[g + HGSS.dex + 4] = 1; // Bisasam gefangen
        d[g + HGSS.bag + 0x520..][..4].copy_from_slice(&[17, 0, 2, 0]); // Medizin: Trank × 2
        let s = parse("soulsilver", &d).unwrap();
        assert_eq!(summary(&s.team), [(155, None, Some(7))]);
        assert_eq!((s.trainer.as_str(), s.money, s.played, s.badges), ("Lyra", 3000, [5, 6, 7], 0x103));
        assert_eq!(s.caught, [1]);
        assert_eq!(s.bag[4], Pocket { id: "medicine", items: vec![[17, 2]] });
        assert_eq!(s.boxes.len(), 18);
        assert!(parse("diamond", &d[..G4_PARTITION]).is_err());
    }

    #[test]
    fn gb_helpers() {
        // „Rötö“: R = 0x91, ö = 0xC4, t = 0xB3
        assert_eq!(gb_text(&[0x91, 0xC4, 0xB3, 0xC4, 0x50, 0x80], G1_CHARS), "Rötö");
        assert_eq!(bcd(&[0x12, 0x34, 0x56]), 123_456);
        // TM01, TM04, TM05 (195 fehlt), TM28, TM29 (220 fehlt), VM01
        assert_eq!([0, 3, 4, 27, 28, 50].map(g2_machine), [191, 194, 196, 219, 221, 243]);
    }

    #[test]
    fn gen1_party() {
        let mut d = vec![0u8; 0x8000];
        d[0x2598..0x259B].copy_from_slice(&[0x91, 0xAE, 0xB3]); // „Rot“, Rest 0 = kein Zeichen
        d[0x259B] = 0x50;
        d[0x25F3..0x25F6].copy_from_slice(&[0x00, 0x30, 0x00]);
        d[0x2602] = 0b101;
        d[0x25A3] = 1; // Bisasam
        let list = 0x2F2C;
        d[list] = 1;
        d[list + 1] = 0x54; // intern 0x54 = Pikachu (25)
        d[list + 2] = 0xFF;
        let m = list + 8;
        d[m] = 0x54;
        d[m + 8] = 84; // Donnerschock
        d[m + 0x0E..m + 0x11].copy_from_slice(&[0, 0x2F, 0x87]); // 12167 EXP
        d[m + 0x1B..m + 0x1D].copy_from_slice(&[0xDA, 0x73]); // DVs Angr 13, Vert 10, Init 7, Spez 3
        d[m + 0x21] = 23;
        d[m + 0x22..m + 0x24].copy_from_slice(&56u16.to_be_bytes());
        let nick = list + 8 + 6 * 44 + 6 * 11;
        d[nick..nick + 2].copy_from_slice(&[0x8F, 0x50]); // „P“
        let s = parse("red", &d).unwrap();
        assert_eq!((s.trainer.as_str(), s.money, s.badges, s.caught.as_slice()), ("Rot", 3000, 0b101, &[1u16][..]));
        assert_eq!(summary(&s.team), [(25, Some("P"), Some(23))]);
        let t = &s.team[0];
        assert_eq!((t.exp, t.ivs.hp, t.ivs.spa, t.ivs.spd, t.nature), (12_167, 11, 3, 3, None));
        assert_eq!(s.boxes.len(), 12);
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
        // Geld, Name „Lisa“, Spielzeit 101:02:03
        d[0x21100..0x21104].copy_from_slice(&123_456u32.to_le_bytes());
        for (i, u) in "Lisa".encode_utf16().chain([0xFFFF]).enumerate() {
            d[0x19404 + i * 2..0x19406 + i * 2].copy_from_slice(&u.to_le_bytes());
        }
        d[0x19424..0x19428].copy_from_slice(&[101, 0, 2, 3]);
        // Pokédex: Bisaknosp (2) und Genesect (649) gefangen
        d[0x21408] = 0b10;
        d[0x21408 + 81] = 1;
        // Box 2, Platz 1; Medizin-Tasche: Trank × 7
        let box2 = 0x400 + 30 * 136 + 0x10;
        d[box2..box2 + 136].copy_from_slice(&mons[1][..136]);
        d[0x18400 + 0x7D8..0x18400 + 0x7DC].copy_from_slice(&[17, 0, 7, 0]);
        let s = parse("white-2", &d).unwrap();
        assert_eq!(s.badges, 0xFF);
        assert_eq!(s.caught, [2, 649]);
        assert_eq!((s.trainer.as_str(), s.money, s.played), ("Lisa", 123_456, [101, 2, 3]));
        assert_eq!(summary(&s.team), [(495, None, Some(5)), (571, Some("Zoroark♀"), Some(42))]);
        assert_eq!((s.team[1].stats.as_ref().map(|st| st.spa), &s.team[1].moves), (Some(99), &vec![15]));
        assert_eq!(s.boxes.len(), 24);
        assert_eq!(s.boxes[1].mons[0].as_ref().map(|m| (m.species_id, m.level)), Some((571, None)));
        assert!(s.boxes[0].mons.iter().all(Option::is_none));
        assert_eq!(s.bag[3], Pocket { id: "medicine", items: vec![[17, 7]] });
        assert_eq!(parse("black", &d).unwrap().badges, 0);
        assert!(parse("black", &[0; 0x80000]).is_err_and(|e| e.contains("leer")));
        assert!(parse("black", &d[..0x40000]).is_err());
        assert!(parse("x", &d).is_err());
    }
}
