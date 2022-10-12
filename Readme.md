# ptxaligner

## Usage as a npm package

```
$ npm install -g ptxaligner
```

then

```bash
$ ptxaligner -h     # to see the list of available commands
$ ptxaligner ./path/to/your/config.json
```
**you have an example of a config.json in the directory 'tests' with a template**

- **Greek usfm** ressources can be found here : https://git.door43.org/unfoldingWord/el-x-koine_ugnt
- **French Ptx** ressources can be found here : https://github.com/mvh-solutions/aligned-lsg1910/tree/main/source_data/alignment/frPtx
- Target languages :
  - **French usfm** ressources can be found here : https://github.com/mvh-solutions/aligned-lsg1910/tree/main/source_data/usfmBooks/fr

# For developpers
## Getting Started

```
$ npm install
$ npm run build
```
then for an alignment usfm for a french text
```
$ npm run testfr
```
or for an alignment usfm for a spanish text
```
$ npm run testes
```
or
```
npx ptxaligner ./path/to/your/config/file.json
```

## How to make your own config file

see the json template below :  
`config.json`
```json
{
  "greek_usfm_path": "",
  "greek_selectors": {"lang": "gre", "abbr": "ugnt"},
  "raw_usfm_path": "",
  "raw_usfm_selectors":  {"lang": "YOUR_3_LETTER_LONG_LANG", "abbr": "PUT_UST_FOR_EG"},
  "ptx_path": ""
}
```

Make sure to fill in all the fields with the appropriate `http` path.  
You can have an example in `tests/test_titus.json`

## Contribute

This package is still in early development.  
But feel free to make a ticket if you run into any problems.