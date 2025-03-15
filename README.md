# python-language-server

## Common Issues with Implementing Language Servers

1. LS are ususally implemented in their native programming languages, hence integrating them into VSCode is a challenge since they have a Node.js runtime.

2. Language features can be resource intensive. For eg., to validate a file, LS has to parse large amount of files, build up ASTs for them and perform static program analysis. This could incur significant CPU and memory usage. (We have to insure that VSCode's performance stays unaffected)

3. Implementing support for `M` languages in `N` code editors the work of `M * N`.

Microsoft's [Language Server Protocol]() provides a standardized API between language tooling and code editor and fixes the above issues.


![LSP](https://code.visualstudio.com/assets/api/language-extensions/language-server-extension-guide/lsp-languages-editors.png)


# TODO:

- [ ] Implement a LS for python which offers hover and go to functionality.
- [ ] 