use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const SCHEMA_VERSION: u64 = 1;

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
    if !id.is_empty() && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-') {
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
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = PathBuf::from(tmp);
    fs::write(&tmp, json).map_err(|e| format!("Schreiben fehlgeschlagen: {e}"))?;
    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("Speichern fehlgeschlagen: {e}")
    })
}

/// Export/Import nur für .json-Dateien, keine beliebigen Pfade.
fn json_path(path: &str) -> Result<&Path, String> {
    let p = Path::new(path);
    if p.extension().is_some_and(|x| x.eq_ignore_ascii_case("json")) {
        Ok(p)
    } else {
        Err("Nur .json-Dateien sind erlaubt".into())
    }
}

fn read_json(path: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(path).map_err(|e| format!("Lesen fehlgeschlagen: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("Ungültiges JSON: {e}"))
}

fn list_in(dir: &Path) -> Result<Vec<RunSummary>, String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("Ordner nicht lesbar: {e}"))?;
    let mut out: Vec<RunSummary> = entries
        .flatten()
        .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
        // Nur die Kopf-Felder deserialisieren; serde überspringt den Rest ohne Value-Baum.
        .filter_map(|e| serde_json::from_str(&fs::read_to_string(e.path()).ok()?).ok())
        .collect();
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
    if let Some(key) = ["team", "badges"].into_iter().find(|k| run.get(*k).is_some_and(|v| !v.is_array())) {
        return Err(format!("Feld „{key}“ ist keine Liste"));
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

#[tauri::command(async)]
fn export_run(run: Value, path: String) -> Result<(), String> {
    write_atomic(json_path(&path)?, &run, true)
}

#[tauri::command(async)]
fn import_run(path: String) -> Result<Value, String> {
    let run = read_json(json_path(&path)?)?;
    validate_import(&run)?;
    Ok(run)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_runs, load_run, save_run, delete_run, export_run, import_run
        ])
        .run(tauri::generate_context!());
    if let Err(e) = result {
        eprintln!("Tauri-Anwendung konnte nicht gestartet werden: {e}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn tmp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("randex-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
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
        fs::write(d.join("kaputt.json"), "{").unwrap();
        let l = list_in(&d).unwrap();
        assert_eq!(l.iter().map(|r| r.id.as_str()).collect::<Vec<_>>(), ["b", "a"]);
        assert_eq!(read_json(&run_path(&d, "a").unwrap()).unwrap()["name"], "N");
        delete_in(&d, "a").unwrap();
        assert_eq!(list_in(&d).unwrap().len(), 1);
        assert!(!d.join("a.json.tmp").exists());
    }

    #[test]
    fn rejects_traversal() {
        let d = tmp("trav");
        for id in ["../x", "a/b", "", "a.b", "..\\x"] {
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
    }

    #[test]
    fn export_import_roundtrip() {
        let d = tmp("exp");
        let p = d.join("out.json");
        export_run(run("a", 1), p.to_string_lossy().into_owned()).unwrap();
        let back = import_run(p.to_string_lossy().into_owned()).unwrap();
        assert_eq!(back, run("a", 1));
        assert!(export_run(run("a", 1), d.join("x.txt").to_string_lossy().into_owned()).is_err());
        assert!(import_run(d.join("x").to_string_lossy().into_owned()).is_err());
    }
}
