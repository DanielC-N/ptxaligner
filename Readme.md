# ptxaligner

## Usage as a npm package

```
$ npm install -g ptxaligner
$ ptxaligner ./path/to/your/config.json
```

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
npm run align ./path/to/your/config/file.json
```

## How to make your own config file

see the json template below :  
`config.json`
```json
{
  "greek_usfm_path": "",
  "greek_selectors": {"lang": "gre", "abbr": "ugnt"},
  "raw_usfm_path": "",
  "raw_usfm_selectors": "",
  "ptx_path": ""
}
```

Make sure to fill in all the fields with the appropriate `http` path.  
You can have an example in `tests/test_titus.json`

## Contribute

This package is still in early development.  
But feel free to make a ticket if you run into any problems.