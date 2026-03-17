# Ícone PWA / Apple Touch Icon

## Status

O iOS **exige PNG 180×180** para "Adicionar à Tela Inicial" — SVG não é suportado. O arquivo `apple-icon.png` é gerado automaticamente.

## Regenerar o ícone

```bash
node scripts/generate-apple-icon.js
```

## Ícone personalizado

Para usar seu próprio logotipo (gravata borboleta, letra A customizada, etc.):

1. **Tamanho:** 180×180 pixels
2. **Formato:** PNG (fundo sólido, sem transparência)
3. **Nome:** `apple-icon.png`
4. **Local:** `public/apple-icon.png`

Substitua o arquivo existente. O iOS aplica cantos arredondados automaticamente.
