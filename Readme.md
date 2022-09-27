# ptxaligner

## Getting Started

```
$ npm install
$ npm run build
$ npm run test
```

## How to

```
npm run align ./path/to/your/config.json
```

see the json template below :  
`config.json`
```json
{
  "greek_usfm_path": "",
  "greek_selectors": "",
  "raw_usfm_path": "",
  "raw_usfm_selectors": "",
  "ptx_path": ""
}
```

Make sure to fill in all the fields with the appropriate `http` path.  
You can have an example in `tests/test_titus.json`
