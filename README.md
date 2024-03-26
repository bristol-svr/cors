# cors
Colstonjs cors


```bash
bun add @colstonjs/cors
```

Usage
```ts
import cors from '@colstonjs/cors';
import Colston from '@colstonjs/core';

const app: Colston = new Colston();

app.use(cors())

app.listen(8000, () => console.log(':listening'));
```

See the [docs](https://colstonjs.pages.dev/docs/utils/cors.html) for more information on `cors` handling in Colstonjs.