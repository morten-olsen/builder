import * as readline from 'node:readline';

const promptPassword = (message: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    process.stdout.write(message);

    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin });
      rl.question('', (answer) => {
        rl.close();
        resolve(answer);
      });
      return;
    }

    let input = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (char: string): void => {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(input);
          break;
        }
        case '\u0003': {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          reject(new Error('User cancelled'));
          break;
        }
        case '\u007f':
        case '\b': {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        }
        default: {
          input += char;
          process.stdout.write('*');
          break;
        }
      }
    };

    process.stdin.on('data', onData);
  });
};

const promptPasswordWithConfirm = async (message: string): Promise<string> => {
  const password = await promptPassword(message);
  const confirm = await promptPassword('Confirm password: ');
  if (password !== confirm) {
    throw new Error('Passwords do not match');
  }
  return password;
};

export { promptPassword, promptPasswordWithConfirm };
