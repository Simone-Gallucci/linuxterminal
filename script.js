new Vue({
  el: '#app',
  data: {
    input: '',
    output: ['Benvenuto nel Simulatore Terminale Linux. Digita "help" per iniziare.'],
    fs: JSON.parse(localStorage.getItem('fs')) || { '/': ['home'], '/home': ['user'], '/home/user': [] },
    fileContent: JSON.parse(localStorage.getItem('fileContent')) || {},
    currentPath: '/home/user',
    logs: JSON.parse(localStorage.getItem('logs')) || [],
    nanoMode: false,
    nanoFile: '',
    nanoContent: '',
    nanoExit: ''
  },
  computed: {
    prompt() {
      return `user@linux:${this.currentPath}$ `;
    }
  },
  methods: {
    saveToLocalStorage() {
      localStorage.setItem('fs', JSON.stringify(this.fs));
      localStorage.setItem('fileContent', JSON.stringify(this.fileContent));
      localStorage.setItem('logs', JSON.stringify(this.logs));
    },
    resolve(path) {
      if (!path || path === '.') return this.currentPath;
      if (path === '..') return this.currentPath.split('/').slice(0, -1).join('/') || '/';
      return (path.startsWith('/') ? path : this.currentPath + '/' + path).replace(/\/+/g, '/');
    },
    handleCommand() {
      const command = this.input.trim();
      this.output.push(`${this.prompt}${command}`);
      this.logs.push(`[${new Date().toLocaleString()}] ${command}`);

      const [cmd, ...argsArr] = command.split(' ');
      const args = argsArr.join(' ');

      switch(cmd) {
        case 'ls':
          let p = this.currentPath;
          let flags = '';
          if (args.startsWith('-')) {
            flags = args;
          } else if (args.includes(' ')) {
            [flags, path] = args.split(' ');
            p = this.resolve(path);
          } else if (args) {
            p = this.resolve(args);
          }
          const items = this.fs[p];
          if (items) {
            if (flags === '-a') {
              this.output.push('.  ..  ' + items.join('  '));
            } else if (flags === '-l') {
              this.output.push(items.map(i => `-rw-r--r-- 1 user user 0 ${new Date().toLocaleDateString()} ${i}`).join('\n'));
            } else if (flags === '-la' || flags === '-al') {
              const date = new Date().toLocaleDateString();
              this.output.push([
                `drwxr-xr-x 2 user user 0 ${date} .`,
                `drwxr-xr-x 2 user user 0 ${date} ..`,
                ...items.map(i => `-rw-r--r-- 1 user user 0 ${date} ${i}`)
              ].join('\n'));
            } else {
              this.output.push(items.join('  '));
            }
          } else {
            this.output.push(`ls: impossibile accedere a '${args}': File o directory non esistente`);
          }
          break;
        case 'cd':
          const newPath = this.resolve(args);
          if (this.fs[newPath]) this.currentPath = newPath;
          else this.output.push(`cd: ${args}: directory non esistente`);
          break;
        case 'mkdir':
          const newDir = this.resolve(args);
          const parent = newDir.split('/').slice(0, -1).join('/') || '/';
          const name = newDir.split('/').pop();
          if (this.fs[parent]) {
            this.fs[newDir] = [];
            this.fs[parent].push(name);
          } else this.output.push("mkdir: directory padre non esistente");
          break;
        case 'touch':
          const newFile = this.resolve(args);
          const fileParent = newFile.split('/').slice(0, -1).join('/') || '/';
          const fileName = newFile.split('/').pop();
          if (this.fs[fileParent]) {
            this.fileContent[newFile] = '';
            this.fs[fileParent].push(fileName);
          } else this.output.push("touch: directory padre non esistente");
          break;
        case 'cat':
          const filePath = this.resolve(args);
          if (this.fileContent[filePath] !== undefined) {
            this.output.push(this.fileContent[filePath]);
          } else this.output.push("cat: file inesistente");
          break;
        case 'nano':
          this.nanoFile = this.resolve(args);
          this.nanoContent = this.fileContent[this.nanoFile] || '';
          this.nanoExit = '';
          this.nanoMode = true;
          break;
        case 'rm':
          const target = this.resolve(args.replace('-r ', ''));
          if (this.fileContent[target] !== undefined) {
            delete this.fileContent[target];
            const parent = target.split('/').slice(0, -1).join('/') || '/';
            const name = target.split('/').pop();
            this.fs[parent] = this.fs[parent].filter(i => i !== name);
          } else if (this.fs[target]) {
            if (args.startsWith('-r')) {
              delete this.fs[target];
              const parent = target.split('/').slice(0, -1).join('/') || '/';
              const name = target.split('/').pop();
              this.fs[parent] = this.fs[parent].filter(i => i !== name);
            } else {
              this.output.push(`rm: '${args}' è una directory. Usa rm -r per rimuoverla.`);
            }
          } else this.output.push("rm: file o directory non trovati");
          break;
        case 'clear':
          this.output = [];
          break;
        case 'help':
          this.output.push(`Comandi disponibili:\n ls [-a|-l|-la], cd, mkdir, touch, cat, nano, rm, clear, showlog, help, exit`);
          break;
        case 'showlog':
          this.output.push("--- LOG ---\n" + this.logs.join('\n') + "\n--- FINE LOG ---");
          break;
        case 'exit':
          this.output.push("Sessione terminata.");
          this.input = '';
          return;
        default:
          this.output.push(`${cmd}: comando non trovato`);
      }
      this.saveToLocalStorage();
      this.input = '';
    },
    handleNanoExit() {
      if (this.nanoExit === 'ctrl+x') {
        this.output.push('Salvare le modifiche? (y/n)');
        this.nanoExit = '';
        const handleConfirm = (e) => {
          if (e.key === 'Enter') {
            const val = e.target.value.trim().toLowerCase();
            if (val === 'y') {
              this.fileContent[this.nanoFile] = this.nanoContent;
              this.output.push('File salvato con successo.');
            } else {
              this.output.push('Modifiche annullate.');
            }
            this.nanoMode = false;
            this.saveToLocalStorage();
            e.target.removeEventListener('keyup', handleConfirm);
          }
        };
        this.$nextTick(() => {
          const input = document.querySelector('.editor input');
          input.placeholder = 'y/n';
          input.addEventListener('keyup', handleConfirm);
        });
      }
    }
  }
});
