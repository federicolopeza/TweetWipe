# 🧹 Tweet Wipe

### *Userscript minimalista para borrar Tweets, Respuestas y Seguidores*

[![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-yellow)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![GreasyFork](https://img.shields.io/badge/GreasyFork-Userscript-red)](https://greasyfork.org/)
[![License: NoHarm](https://img.shields.io/badge/License-NoHarm%20draft-brightgreen)](https://github.com/lucahammer/tweetXer/blob/main/LICENSE)

---

## 👨‍💻 **Creado por [@Falopp](https://github.com/Falopp)**

---

## 📋 **¿Qué es TweetFalopp?**

`TweetFalopp` es un *fork simplificado* de [TweetXer](https://github.com/lucahammer/tweetXer/) de Luca Hammer.

El objetivo original de TweetXer era borrar tweets (y más) usando archivos de la exportación oficial de datos. Esta versión recortada:

* Elimina la dependencia de archivos.  
* Añade una **interfaz emergente** con 3 botones:  
  **Borrar Tweets**, **Borrar Respuestas** y **Borrar Seguidores**.  
* Mantiene «modo lento» para respetar límites de X/Twitter.  
* Incluye consola de depuración para ver llamadas `DeleteTweet`.

---

## ⚡ **Funcionalidades Principales**

- **Borrar Tweets (Posts)**: Limpia tu timeline principal.
- **Borrar Respuestas (Replies)**: Elimina tus respuestas a otros usuarios.
- **Unfollow masivo**: Deja de seguir a todos los usuarios con un clic.
- **Popup centrado**: UI moderna con overlay semitransparente.
- **Barra de progreso y contador**: Feedback en tiempo real.
- **Depuración integrada**: Intercepta peticiones `DeleteTweet` en la consola.

---

## 🛠️ **Instalación**

> No requiere extensiones si copias el código directamente. Para uso frecuente se recomienda un gestor de userscripts (Violentmonkey, Tampermonkey, etc.).

### 1. Copia el Script

1. Abre `1.js` (contenido del repositorio) y copia todo.
2. Ve a X/Twitter y abre la consola del navegador (`F12`).
3. Pega el script y presiona `Enter`.

### 2. (Opcional) Instalar como Userscript

1. Instala **Violentmonkey** / **Tampermonkey**.  
2. Crea un nuevo userscript y pega el contenido de `1.js`.  
3. Guarda. La barra de TweetFalopp aparecerá automáticamente al visitar X.

---

## 🚀 **Cómo Usar**

1. Se mostrará un overlay gris y un popup azul en el centro.
2. Elige una acción:
   - **Borrar Tweets** → limpia la pestaña *Posts/Tweets*.
   - **Borrar Respuestas** → limpia la pestaña *Replies/Respuestas*.
   - **Borrar Seguidores** → deja de seguir a todas las cuentas.
3. Observa la barra de progreso; el proceso es *lento pero seguro* (apx. 1 tweet/seg).
4. Al terminar, recarga la página para verificar.

---

## 📁 **Estructura del Repositorio**

```
TweetFalopp/
├── 1.js          # Script principal (userscript)
├── README.md     # Este archivo
```

---

## ⚠️ **Advertencias Importantes**

- **🚨 RIESGO**: Interaccionar con la API de X/Twitter puede conllevar restricciones de cuenta. Úsalo bajo tu propia responsabilidad.
- **📜 LICENCIA**: Mantiene la licencia *NoHarm-draft* de TweetXer.
- **🤝 CRÉDITOS**: Todo el mérito es de [Luca Hammer](https://github.com/lucahammer) y sus colaboradores. Este fork sólo simplifica y traduce.

---

## 🐛 **Problemas Comunes**

| Problema | Solución |
|----------|----------|
| El popup no aparece | Asegúrate de haber pegado todo el script y pulsa *Allow pasting* en la consola de Chrome. |
| Sólo desaparece el tweet localmente | Abre pestaña **Network** y revisa peticiones `DeleteTweet` (debe devolver 200). |
| Rate limit (429) | El script espera automáticamente; sólo déjalo correr. |

---

**Hecho con 💙 por [@Falopp](https://github.com/Falopp)** &nbsp;&middot;&nbsp; [⭐ Star si te fue útil](https://github.com/Falopp/tweetFalopp) 
