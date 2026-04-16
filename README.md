# Super Mario Bros Tileset Assembler

Status: Usable; but work in progress

## Purpose
TLDR; You can export a tileset from your Super Mario Bros NES ROM in a one line command.

<img width="2553" height="1328" alt="Screenshot 2026-03-17 at 2 45 45 AM" src="https://github.com/user-attachments/assets/9dbd07e1-269c-4169-b2da-5baa5e81050d" />

Super Mario Bros CHR (Character Rom) file can be easily extracted from the game. This is the source used to piece together the assets in the game. This tool assembles the 8x8 cells into recipes.


**Fast Export (I want the tileset quick!)**
- Place smb.nes in root
- Run `python3 scripts/extract_chr.py && python3 scripts/chr_mapping_render.py`


Notes:
- Super Mario Bros NES rom file (smb.nes) not provided here
- Current web application uses smb.nes to extract CHR into memory on the frontend.
- You will still need to extract the CHR file to use the `chr_mapping_render.py` to render the layout into a PNG.
- This workflow will be updated in a future commit to be more streamlined.
- For game dev purposes, a color agnostic export can be run as:
- `python3 scripts/chr_mapping_render.py --indexed`
