// Blendet in Release-Builds das Konsolenfenster unter Windows aus.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    randex_lib::run()
}
