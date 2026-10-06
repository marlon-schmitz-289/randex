use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, FileDialogBuilder};

const SCHEMA_VERSION: u64 = 1;
const MAX_JSON_BYTES: u64 = 50 * 1024 * 1024;

#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct RunSummary {
    id: String,
    name: String,
    game_id: String,
    updated_at: u64,
}

fn runs_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("App-Datenverzeichnis nicht gefunden: {e}"))?
        .join("runs");
    fs::create_dir_all(&dir).map_err(|e| format!("Ordner konnte nicht angelegt werden: {e}"))?;
    Ok(dir)
}

fn valid_id(id: &str) -> Result<&str, String> {
    if !id.is_empty() && id.len() <= 64 && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-') {
        Ok(id)
    } else {
        Err("Ungültige Run-ID".into())
    }
}

fn str_field<'a>(run: &'a Value, key: &str) -> Result<&'a str, String> {
    run.get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("Feld „{key}“ fehlt oder ist kein Text"))
}

fn run_path(dir: &Path, id: &str) -> Result<PathBuf, String> {
    Ok(dir.join(format!("{}.json", valid_id(id)?)))
}

fn write_atomic(path: &Path, run: &Value, pretty: bool) -> Result<(), String> {
    let json = if pretty {
        serde_json::to_string_pretty(run)
    } else {
        serde_json::to_string(run)
    }
    .map_err(|e| format!("Serialisierung fehlgeschlagen: {e}"))?;
    // Eindeutiger Tmp-Name, da sich Saves derselben Run überlappen können.
    static SEQ: AtomicU64 = AtomicU64::new(0);
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(format!(".{}.tmp", SEQ.fetch_add(1, Ordering::Relaxed)));
    let tmp = PathBuf::from(tmp);
    let written = fs::File::create(&tmp)
        .and_then(|mut f| f.write_all(json.as_bytes()).and_then(|()| f.sync_all()))
        .map_err(|e| format!("Schreiben fehlgeschlagen: {e}"))
        .and_then(|()| fs::rename(&tmp, path).map_err(|e| format!("Speichern fehlgeschlagen: {e}")));
    if written.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    written
}

fn json_path(p: &Path) -> Result<&Path, String> {
    if p.extension().is_some_and(|x| x.eq_ignore_ascii_case("json")) {
        Ok(p)
    } else {
        Err("Nur .json-Dateien sind erlaubt".into())
    }
}

fn read_json(path: &Path) -> Result<Value, String> {
    let len = fs::metadata(path).map_err(|e| format!("Lesen fehlgeschlagen: {e}"))?.len();
    if len > MAX_JSON_BYTES {
        return Err("Datei ist zu groß".into());
    }
    let text = fs::read_to_string(path).map_err(|e| format!("Lesen fehlgeschlagen: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("Ungültiges JSON: {e}"))
}

fn list_in(dir: &Path) -> Result<Vec<RunSummary>, String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("Ordner nicht lesbar: {e}"))?;
    let mut out = Vec::new();
    for path in entries.flatten().map(|e| e.path()) {
        if !path.extension().is_some_and(|x| x == "json") {
            continue;
        }
        // Nur die Kopf-Felder deserialisieren, der Rest wird übersprungen.
        let summary = fs::read_to_string(&path)
            .map_err(|e| e.to_string())
            .and_then(|t| serde_json::from_str::<RunSummary>(&t).map_err(|e| e.to_string()));
        match summary {
            // Sonst liefe load_run/delete_run mit dieser ID ins Leere.
            Ok(s) if path.file_stem().is_some_and(|f| *f == *s.id) => out.push(s),
            Ok(_) => eprintln!("Übersprungen (ID passt nicht zum Dateinamen): {}", path.display()),
            Err(e) => eprintln!("Übersprungen ({e}): {}", path.display()),
        }
    }
    out.sort_by_key(|a| std::cmp::Reverse(a.updated_at));
    Ok(out)
}

fn save_in(dir: &Path, run: &Value) -> Result<(), String> {
    let id = str_field(run, "id")?;
    write_atomic(&run_path(dir, id)?, run, false)
}

fn delete_in(dir: &Path, id: &str) -> Result<(), String> {
    fs::remove_file(run_path(dir, id)?).map_err(|e| format!("Löschen fehlgeschlagen: {e}"))
}

fn require(run: &Value, keys: &[&str], ok: fn(&Value) -> bool, what: &str) -> Result<(), String> {
    match keys.iter().find(|k| !run.get(**k).is_some_and(ok)) {
        Some(key) => Err(format!("Feld „{key}“ fehlt oder ist {what}")),
        None => Ok(()),
    }
}

fn validate_import(run: &Value) -> Result<(), String> {
    valid_id(str_field(run, "id")?)?;
    str_field(run, "name")?;
    str_field(run, "gameId")?;
    require(run, &["createdAt", "updatedAt"], Value::is_u64, "keine Zahl")?;
    require(run, &["enabledCategories", "customLocations"], Value::is_array, "keine Liste")?;
    require(run, &["pokemon", "encounters"], Value::is_object, "kein Objekt")?;
    // Optional (neuer als schemaVersion 1), aber wenn vorhanden, dann Liste
    for key in ["team", "badges"] {
        if run.get(key).is_some_and(|v| !v.is_array()) {
            return Err(format!("Feld „{key}“ ist keine Liste"));
        }
    }
    match run.get("schemaVersion").and_then(Value::as_u64) {
        Some(v) if v <= SCHEMA_VERSION => Ok(()),
        Some(_) => Err("Run stammt aus einer neueren Version von Randex".into()),
        None => Err("Feld „schemaVersion“ fehlt".into()),
    }
}

#[tauri::command(async)]
fn list_runs(app: tauri::AppHandle) -> Result<Vec<RunSummary>, String> {
    list_in(&runs_dir(&app)?)
}

#[tauri::command(async)]
fn load_run(app: tauri::AppHandle, id: String) -> Result<Value, String> {
    read_json(&run_path(&runs_dir(&app)?, &id)?)
}

#[tauri::command(async)]
fn save_run(app: tauri::AppHandle, run: Value) -> Result<(), String> {
    save_in(&runs_dir(&app)?, &run)
}

#[tauri::command(async)]
fn delete_run(app: tauri::AppHandle, id: String) -> Result<(), String> {
    delete_in(&runs_dir(&app)?, &id)
}

fn json_dialog(app: &tauri::AppHandle) -> FileDialogBuilder<tauri::Wry> {
    app.dialog().file().add_filter("Randex-Run", &["json"])
}

fn picked(path: Option<tauri_plugin_dialog::FilePath>) -> Result<Option<PathBuf>, String> {
    path.map(|p| p.into_path().map_err(|e| format!("Ungültiger Pfad: {e}"))).transpose()
}

fn export_to(path: &Path, run: &Value) -> Result<(), String> {
    write_atomic(json_path(path)?, run, true)
}

fn import_from(path: &Path) -> Result<Value, String> {
    let run = read_json(json_path(path)?)?;
    validate_import(&run)?;
    Ok(run)
}

/// Pfade kommen nur aus dem nativen Dialog, nie aus dem Webview.
#[tauri::command(async)]
fn export_run(app: tauri::AppHandle, run: Value) -> Result<bool, String> {
    let name = format!("{}.json", str_field(&run, "name")?);
    let Some(path) = picked(json_dialog(&app).set_file_name(name).blocking_save_file())? else {
        return Ok(false);
    };
    export_to(&path, &run)?;
    Ok(true)
}

#[tauri::command(async)]
fn import_run(app: tauri::AppHandle) -> Result<Option<Value>, String> {
    picked(json_dialog(&app).blocking_pick_file())?.map(|p| import_from(&p)).transpose()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            list_runs, load_run, save_run, delete_run, export_run, import_run
        ])
        .run(tauri::generate_context!());
    if let Err(e) = result {
        eprintln!("Tauri-Anwendung konnte nicht gestartet werden: {e}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    struct TmpDir(PathBuf);

    impl Drop for TmpDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    impl std::ops::Deref for TmpDir {
        type Target = Path;
        fn deref(&self) -> &Path {
            &self.0
        }
    }

    fn tmp(name: &str) -> TmpDir {
        let d = std::env::temp_dir().join(format!("randex-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        TmpDir(d)
    }

    fn run(id: &str, t: u64) -> Value {
        json!({"schemaVersion":1,"id":id,"name":"N","gameId":"black","createdAt":t,"updatedAt":t,
            "enabledCategories":[],"customLocations":[],"pokemon":{},"encounters":{}})
    }

    #[test]
    fn save_load_list_delete() {
        let d = tmp("crud");
        save_in(&d, &run("a", 1)).unwrap();
        save_in(&d, &run("b", 2)).unwrap();
        assert!(d.read_dir().unwrap().flatten().all(|e| e.path().extension().unwrap() == "json"));
        fs::write(d.join("kaputt.json"), "{").unwrap();
        fs::write(d.join("fremd.json"), r#"{"x":1}"#).unwrap();
        fs::write(d.join("c.json.0.tmp"), run("c", 3).to_string()).unwrap();
        fs::write(d.join("falsch.json"), run("d", 4).to_string()).unwrap();
        let l = list_in(&d).unwrap();
        assert_eq!(l.iter().map(|r| r.id.as_str()).collect::<Vec<_>>(), ["b", "a"]);
        assert_eq!(read_json(&run_path(&d, "a").unwrap()).unwrap()["name"], "N");
        assert!(read_json(&run_path(&d, "fehlt").unwrap()).is_err());
        delete_in(&d, "a").unwrap();
        assert_eq!(list_in(&d).unwrap().len(), 1);
    }

    #[test]
    fn write_atomic_cleans_tmp_on_error() {
        let d = tmp("atomic");
        fs::create_dir(d.join("a.json")).unwrap();
        assert!(save_in(&d, &run("a", 1)).is_err());
        assert_eq!(d.read_dir().unwrap().count(), 1);
    }

    #[test]
    fn rejects_traversal() {
        let d = tmp("trav");
        let long = "a".repeat(65);
        for id in ["../x", "a/b", "", "a.b", "..\\x", &long] {
            assert!(run_path(&d, id).is_err(), "{id}");
            assert!(save_in(&d, &run(id, 1)).is_err(), "{id}");
            assert!(delete_in(&d, id).is_err(), "{id}");
        }
    }

    #[test]
    fn import_validation() {
        assert!(validate_import(&run("a", 1)).is_ok());
        let mut r = run("a", 1);
        r["schemaVersion"] = json!(2);
        assert!(validate_import(&r).is_err());
        assert!(validate_import(&json!({"id":"a"})).is_err());
        assert!(validate_import(&run("../a", 1)).is_err());
        let mut r = run("a", 1);
        r.as_object_mut().unwrap().remove("encounters");
        assert!(validate_import(&r).is_err());
        let mut r = run("a", 1);
        r["updatedAt"] = json!("gestern");
        assert!(validate_import(&r).is_err());
        let mut r = run("a", 1);
        r["team"] = json!([{"speciesId": 25}]);
        assert!(validate_import(&r).is_ok());
        r["badges"] = json!("alle");
        assert!(validate_import(&r).is_err());
        let mut r = run("a", 1);
        r.as_object_mut().unwrap().remove("schemaVersion");
        assert!(validate_import(&r).is_err());
        r["schemaVersion"] = json!("1");
        assert!(validate_import(&r).is_err());
        assert!(validate_import(&json!([])).is_err());
    }

    #[test]
    fn export_import_roundtrip() {
        let d = tmp("exp");
        let p = d.join("out.json");
        export_to(&p, &run("a", 1)).unwrap();
        assert_eq!(import_from(&p).unwrap(), run("a", 1));
        assert!(export_to(&d.join("x.txt"), &run("a", 1)).is_err());
        assert!(import_from(&d.join("x")).is_err());
        fs::write(d.join("neu.json"), json!({"schemaVersion": 9}).to_string()).unwrap();
        assert!(import_from(&d.join("neu.json")).is_err());
    }
}
