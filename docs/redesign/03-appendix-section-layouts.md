# Appendix A: section-by-section layout of every artboard

Generated from the artboard source files in `artboards/`. Each numbered item is one top-level block, in page order, with its exact inline styles and the main layout boxes inside it. Headings are only there to help you find the block in the screenshot: the words are placeholder, keep the live copy. For anything not listed here (font sizes, colours of single words, icons), open the artboard file: it is the full spec.

## Homepage

Source `artboards/Main.dc.html` · screenshot `shots/Main-1440.jpg`

1. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 10px 10px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`
2. **<section>** : h1: Your organisation has vampires.
   - block: `display: flex; flex-wrap: wrap; align-items: stretch; padding-top: clamp(40px, 5vw, 72px)`
   - `<div> flex: 999 1 560px; min-width: 0; padding: clamp(32px, 5vw, 80px) clamp(16px, 5vw, 64px) clamp(48px, 6vw, 96px) clamp(16px, 5vw, 96px); display: flex; flex-direction: column; justify-content: center; gap: 28px`
   - `  <p> margin: 0; font-size: 19px; line-height: 1.7; color: #5C4965; max-width: 580px;`
   - `    <a> display: inline-flex; align-items: center; height: 52px; padding: 0 28px; border-radius: 999px; background: #26142E; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none`
   - `  <img> position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 28px 0 0 28px`
3. **<section>**
   - block: `margin: clamp(40px, 5vw, 72px) clamp(16px, 3vw, 48px) 0; border-radius: 32px; padding: clamp(48px, 5vw, 72px) clamp(24px, 5vw, 80px); background: #2A0E33; color: #FBF7EC`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px`
   - `  <div> display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 32px`
   - `    <div> display: flex; flex-direction: column; gap: 8px; padding-left: 20px; border-left: 2px solid rgba(229,197,79,0.5)`
   - `    <div> display: flex; flex-direction: column; gap: 8px; padding-left: 20px; border-left: 2px solid rgba(229,197,79,0.5)`
   - `    <div> display: flex; flex-direction: column; gap: 8px; padding-left: 20px; border-left: 2px solid rgba(229,197,79,0.5)`
   - `    <div> display: flex; flex-direction: column; gap: 8px; padding-left: 20px; border-left: 2px solid rgba(229,197,79,0.5)`
4. **<section>** : h2: 36 countries.
   - block: `padding: clamp(64px, 7vw, 112px) clamp(16px, 5vw, 96px) 0`
   - `<div> max-width: 1280px; margin: 0 auto; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,`
   - `    <div> flex: 1 1 520px; display: flex; flex-direction: column; gap: 16px; max-width: 640px`
   - `      <div> display: flex; flex-direction: column; gap: 4px`
   - `      <div> display: flex; flex-direction: column; gap: 4px`
   - `    <div> position: absolute; left: 0; top: 0; pointer-events: none; opacity: 0; transform: translate(-50%, calc(-100% - 14px)); transition: opacity .15s ease; background: #2A0E33; color: #FBF7EC; border-radius: 12px; padding: 8px 12px; box-shadow: 0 8px 24px -10px rgba(38,20,46,`
   - `        <span> width: 18px; height: 12px; border-radius: 4px; background: #E5C54F`
   - `        <span> width: 18px; height: 12px; border-radius: 4px; background: #4D1B5E`
   - `        <span> width: 18px; height: 12px; border-radius: 4px; background: #3E164B`
5. **<section>** : h2: Six ways in, one vampire. · h3: Internal Communications
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px`
   - `    <a> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; display: fl`
   - `        <span> width: 12px; height: 12px; border-radius: 999px; background: #43143B`
   - `    <a> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; display: fl`
   - `        <span> width: 12px; height: 12px; border-radius: 999px; background: #002B67`
   - `    <a> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; display: fl`
6. **<section>** : h2: Clarity is not a mood board.
   - block: `padding: clamp(40px, 4vw, 64px) clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `      <img> position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 28px`
   - `      <span> position: absolute; right: -12px; bottom: -22px; background: #FFFFFF; padding: 10px 18px; border-radius: 14px; box-shadow: 0 12px 30px -18px rgba(38,20,46,0.4)`
   - `    <div> flex: 1 1 480px; display: flex; flex-direction: column; gap: 20px`
7. **<section>** : h2: The work, with the lid · h3: Getting 60% of a global company to show up live
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px); background: rgba(244,240,236,0.72); border-radius: 32px; margin: 0 clamp(16px, 3vw, 48px); padding-left: clamp(24px, 4vw, 48px); padding-right: clamp(24px, 4vw, 48px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `    <div> display: flex; flex-direction: column; gap: 16px`
   - `  <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px`
   - `    <a> display: flex; flex-direction: column; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,`
   - `      <div> padding: 26px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1`
   - `          <span> font-size: 11px; font-weight: 700; letter-spacing: 0.18em; padding: 6px 12px; border-radius: 999px; background: #E6C24C; color: #26142E`
   - `            <span> width: 9px; height: 9px; border-radius: 999px; background: #43143B`
   - `    <a> display: flex; flex-direction: column; text-decoration: none; color: inherit`
8. **<section>** : h2: Here's the problem, and here's the fix. · h3: Who this is for
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: flex; flex-direction: column; gap: 24px`
   - `    <article> background: #2A0E33; border-radius: 28px; padding: clamp(32px, 4vw, 52px); display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 32px; color: #FBF7EC`
   - `    <div> display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; align-items: stretch`
   - `      <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; dis`
   - `        <span> width: 36px; height: 4px; border-radius: 4px; background: #481C5F`
   - `      <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; dis`
9. **<section>** #vows : h2: Before we shake hands, · h3: Precision over pomp
   - block: `padding: clamp(40px, 4vw, 64px) clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 34px; displ`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 34px; displ`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 34px; displ`
10. **<section>** : h2: Questions people ask before they call. · h3: What does The Magic Coffin do?
   - block: `padding: clamp(40px, 4vw, 64px) clamp(16px, 5vw, 96px) 0px;`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 48px`
   - `    <div> grid-column: span 5; display: flex; flex-direction: column; gap: 20px`
   - `      <img> width: 100%; height: 360px; object-fit: cover; border-radius: 24px; margin-top: 12px`
   - `    <div> grid-column: span 7; display: flex; flex-direction: column; gap: 24px`
   - `            <span> flex: none; width: 34px; height: 34px; border-radius: 999px; border: 1px solid #D6C9DC; display: flex; align-items: center; justify-content: center; color: #481C5F; font-size: 18px`
   - `            <p> margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #5C4965; max-width: 720px`
   - `            <p> margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #5C4965; max-width: 720px`
11. **<section>** #contact : h2: Not sure where to start?
   - block: `position: relative; z-index: 1; padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px)`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 56px; align-items: flex-start`
   - `  <div> flex: 1 1 440px; display: flex; flex-direction: column; gap: 20px`
   - `    <p> margin: 0; font-size: 18px; line-height: 1.7; color: #5C4965; max-width: 520px;`
   - `    <span> font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 15px; letter-spacing: 0.18em; color: #672786; border: 1.5px solid #672786; padding: 8px 14px; border-radius: 4px; transform: rotate(-6deg); align-self: flex-start; margin-top: 12px`
   - `  <form> flex: 1 1 420px; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding:`
   - `    <label> display: flex; flex-direction: column; gap: 8px; font-size: 14px; font-weight: 600; color: #26142E`
   - `      <input> height: 52px; padding: 0 18px; border-radius: 14px; border: 1px solid #D6C9DC; background: #FFFFFF; font-family: 'Inter', sans-serif; font-size: 15px; color: #26142E`
   - `    <label> display: flex; flex-direction: column; gap: 8px; font-size: 14px; font-weight: 600; color: #26142E`
12. **<footer>**
   - block: `position: relative; z-index: 1; padding: 56px clamp(16px, 5vw, 96px) 56px; border-top: 1px solid #E5D7EA`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px`
   - `    <div> flex: 1 1 420px; display: flex; flex-direction: column; gap: 16px; max-width: 560px`
   - `    <div> display: flex; flex-direction: column; gap: 12px`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #43143B`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #002B67`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #6A010E`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #003728`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #883500`

## Services index

Source `artboards/Services.dc.html` · screenshot `shots/Services-1440.jpg`

1. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 10px 10px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`
2. **<section>** : h1: Six ways in.
   - block: `display: flex; flex-wrap: wrap; align-items: stretch; padding-top: clamp(40px, 5vw, 72px)`
   - `<div> flex: 999 1 560px; min-width: 0; padding: clamp(32px, 5vw, 80px) clamp(16px, 5vw, 64px) clamp(48px, 6vw, 96px) clamp(16px, 5vw, 96px); display: flex; flex-direction: column; justify-content: center; gap: 28px`
   - `  <p> margin: 0; font-size: 22px; line-height: 1.7; color: #5C4965; max-width: 600px;`
   - `    <a> display: inline-flex; align-items: center; height: 52px; padding: 0 28px; border-radius: 999px; background: #26142E; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none`
   - `  <img> position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 28px 0 0 28px`
3. **<section>** : h2: Six pillars, one specialist, no hand-offs. · h2: Internal Communications
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `    <a> display: grid; grid-template-columns: 96px minmax(0, 1.2fr) minmax(0, 1.6fr) 220px; gap: 32px; align-items: center; padding: 34px 0; border-bottom: 1px solid #E5D7EA; text-decoration: none; color: inherit`
   - `      <span> width: 72px; height: 72px; border-radius: 22px; background: #43143B; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 24px`
   - `      <div> display: flex; flex-direction: column; gap: 6px`
   - `      <div> display: flex; flex-direction: column; align-items: flex-end; gap: 6px`
   - `    <a> display: grid; grid-template-columns: 96px minmax(0, 1.2fr) minmax(0, 1.6fr) 220px; gap: 32px; align-items: center; padding: 34px 0; border-bottom: 1px solid #E5D7EA; text-decoration: none; color: inherit`
   - `      <span> width: 72px; height: 72px; border-radius: 22px; background: #002B67; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 24px`
4. **<section>** : h2: Not sure which one you need? · h3: Which pillar should I start with if I'm not sure?
   - block: `padding: 0px clamp(16px, 5vw, 96px) 0px;`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 48px`
   - `    <div> grid-column: span 4; display: flex; flex-direction: column; gap: 18px`
   - `          <span> flex: none; width: 34px; height: 34px; border-radius: 999px; border: 1px solid #D6C9DC; display: flex; align-items: center; justify-content: center; color: #481C5F; font-size: 18px`
   - `          <p> margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #5C4965; max-width: 720px`
   - `          <p> margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #5C4965; max-width: 720px`
   - `          <p> margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #5C4965; max-width: 720px`
   - `          <p> margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #5C4965; max-width: 720px`
5. **<section>** #contact : h2: Not sure where to start?
   - block: `position: relative; z-index: 1; padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px)`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 56px; align-items: flex-start`
   - `  <div> flex: 1 1 440px; display: flex; flex-direction: column; gap: 20px`
   - `    <p> margin: 0; font-size: 18px; line-height: 1.7; color: #5C4965; max-width: 520px;`
   - `    <span> font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 15px; letter-spacing: 0.18em; color: #672786; border: 1.5px solid #672786; padding: 8px 14px; border-radius: 4px; transform: rotate(-6deg); align-self: flex-start; margin-top: 12px`
   - `  <form> flex: 1 1 420px; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding:`
   - `    <label> display: flex; flex-direction: column; gap: 8px; font-size: 14px; font-weight: 600; color: #26142E`
   - `      <input> height: 52px; padding: 0 18px; border-radius: 14px; border: 1px solid #D6C9DC; background: #FFFFFF; font-family: 'Inter', sans-serif; font-size: 15px; color: #26142E`
   - `    <label> display: flex; flex-direction: column; gap: 8px; font-size: 14px; font-weight: 600; color: #26142E`
6. **<footer>**
   - block: `position: relative; z-index: 1; padding: 56px clamp(16px, 5vw, 96px) 56px; border-top: 1px solid #E5D7EA`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px`
   - `    <div> flex: 1 1 420px; display: flex; flex-direction: column; gap: 16px; max-width: 560px`
   - `    <div> display: flex; flex-direction: column; gap: 12px`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #43143B`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #002B67`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #6A010E`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #003728`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #883500`

## About

Source `artboards/About.dc.html` · screenshot `shots/About-1440.jpg`

1. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 10px 10px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`
2. **<section>** : h1: This is your
   - block: `display: flex; flex-wrap: wrap; align-items: stretch; padding-top: clamp(40px, 5vw, 72px)`
   - `<div> flex: 999 1 560px; min-width: 0; padding: clamp(32px, 5vw, 80px) clamp(16px, 5vw, 64px) clamp(48px, 6vw, 96px) clamp(16px, 5vw, 96px); display: flex; flex-direction: column; justify-content: center; gap: 28px`
   - `  <p> margin: 0; font-size: 18px; line-height: 1.7; color: #5C4965; max-width: 600px;`
   - `    <a> display: inline-flex; align-items: center; height: 52px; padding: 0 28px; border-radius: 999px; background: #26142E; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none`
   - `    <span> display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,0.75); border: 1px solid #DED3E4; font-size: 13px; color: #26142E`
   - `      <span> width: 8px; height: 8px; border-radius: 999px; background: #43143B`
   - `    <span> display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,0.75); border: 1px solid #DED3E4; font-size: 13px; color: #26142E`
   - `      <span> width: 8px; height: 8px; border-radius: 999px; background: #002B67`
   - `    <span> display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,0.75); border: 1px solid #DED3E4; font-size: 13px; color: #26142E`
3. **<section>** : h2: Every haunted organisation has a
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 48px`
   - `    <div> grid-column: span 4; display: flex; flex-direction: column; gap: 18px; align-self: start`
   - `    <div> grid-column: span 8; display: flex; flex-direction: column; gap: 22px; max-width: 720px`
4. **<section>** : h2: Some things get buried. · h3: Your engagement survey is a hack.
   - block: `padding: 0px clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 32px; displ`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 32px; displ`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 32px; displ`
   - `  <div> max-width: 760px; display: flex; flex-direction: column; gap: 20px`
5. **<section>** : h2: One person instead of five job postings.
   - block: `padding: clamp(40px, 4vw, 64px) clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 48px; align-items: start`
   - `    <div> grid-column: span 5; display: flex; flex-direction: column; gap: 16px`
   - `      <div> aspect-ratio: 4 / 5; border-radius: 28px; border: 1.5px dashed #B8912B; background: #FBF5DC; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 24px`
   - `      <div> display: flex; flex-direction: column; gap: 2px`
   - `    <div> grid-column: span 7; display: flex; flex-direction: column; gap: 22px`
   - `        <span> padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,0.8); border: 1px solid #DED3E4; font-size: 13px; color: #26142E`
   - `        <span> padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,0.8); border: 1px solid #DED3E4; font-size: 13px; color: #26142E`
6. **<section>** : h2: Numbers instead of adjectives.
   - block: `margin: clamp(40px, 5vw, 72px) clamp(16px, 3vw, 48px) 0; border-radius: 32px; padding: clamp(48px, 5vw, 72px) clamp(24px, 5vw, 80px); background: #2A0E33; color: #FBF7EC`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px`
   - `  <div> display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 32px`
   - `    <div> display: flex; flex-direction: column; gap: 8px; padding-left: 20px; border-left: 2px solid rgba(229,197,79,0.5)`
   - `    <div> display: flex; flex-direction: column; gap: 8px; padding-left: 20px; border-left: 2px solid rgba(229,197,79,0.5)`
   - `    <div> display: flex; flex-direction: column; gap: 8px; padding-left: 20px; border-left: 2px solid rgba(229,197,79,0.5)`
   - `    <div> display: flex; flex-direction: column; gap: 8px; padding-left: 20px; border-left: 2px solid rgba(229,197,79,0.5)`
7. **<section>** : h2: The right fit matters more than the right brief. · h3: Scale-ups growing faster than their infrastructure
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) 0px;`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; displ`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; displ`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; displ`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; displ`
8. **<section>** #contact : h2: Wondering where to start?
   - block: `position: relative; z-index: 1; padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px)`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 56px; align-items: flex-start`
   - `  <div> flex: 1 1 440px; display: flex; flex-direction: column; gap: 20px`
   - `    <p> margin: 0; font-size: 18px; line-height: 1.7; color: #5C4965; max-width: 520px;`
   - `    <span> font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 15px; letter-spacing: 0.18em; color: #672786; border: 1.5px solid #672786; padding: 8px 14px; border-radius: 4px; transform: rotate(-6deg); align-self: flex-start; margin-top: 12px`
   - `  <form> flex: 1 1 420px; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding:`
   - `    <label> display: flex; flex-direction: column; gap: 8px; font-size: 14px; font-weight: 600; color: #26142E`
   - `      <input> height: 52px; padding: 0 18px; border-radius: 14px; border: 1px solid #D6C9DC; background: #FFFFFF; font-family: 'Inter', sans-serif; font-size: 15px; color: #26142E`
   - `    <label> display: flex; flex-direction: column; gap: 8px; font-size: 14px; font-weight: 600; color: #26142E`
9. **<footer>**
   - block: `position: relative; z-index: 1; padding: 56px clamp(16px, 5vw, 96px) 56px; border-top: 1px solid #E5D7EA`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px`
   - `    <div> flex: 1 1 420px; display: flex; flex-direction: column; gap: 16px; max-width: 560px`
   - `    <div> display: flex; flex-direction: column; gap: 12px`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #43143B`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #002B67`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #6A010E`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #003728`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #883500`

## Work index

Source `artboards/Work.dc.html` · screenshot `shots/Work-1440.jpg`

1. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 10px 10px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`
2. **<header>** : h1: The work, with the lid
   - block: `padding: clamp(56px, 7vw, 112px) clamp(16px, 5vw, 96px) clamp(40px, 4vw, 64px)`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px`
   - `  <h1> margin: 0; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: clamp(44px, 6.4vw, 96px); line-height: 0.94; letter-spacing: -0.025em; color: #481C5F; max-width: 960px`
   - `  <p> margin: 0; max-width: 680px; font-size: 19px; line-height: 1.7; color: #5C4965`
   - `      <span> font-size: 11px; font-weight: 700; letter-spacing: 0.18em; padding: 6px 12px; border-radius: 999px; background: #E6C24C; color: #26142E`
   - `      <span> font-size: 11px; font-weight: 700; letter-spacing: 0.18em; padding: 6px 12px; border-radius: 999px; background: #F7F1F8; color: #481C5F; border: 1px solid #D6C9DC`
   - `      <span> font-size: 11px; font-weight: 700; letter-spacing: 0.18em; padding: 5px 11px; border-radius: 999px; color: #815E18; border: 1px solid #815E18`
3. **<section>**
   - block: `padding: 0 clamp(16px, 5vw, 96px)`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; padding: 24px; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow`
4. **<section>** : h2: {{item.title}}
   - block: `padding: 40px clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px)`
   - `<div> max-width: 1280px; margin: 0 auto`
   - `    <div> padding: 64px 32px; border: 1px dashed #D6C9DC; border-radius: 24px; text-align: center; display: flex; flex-direction: column; gap: 10px; align-items: center; background: rgba(255,255,255,0.6)`
   - `  <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px`
   - `        <div> padding: 26px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1`
   - `              <span> font-size: 11px; font-weight: 700; letter-spacing: 0.18em; padding: 6px 12px; border-radius: 999px; background: #E6C24C; color: #26142E`
   - `              <span> font-size: 11px; font-weight: 700; letter-spacing: 0.18em; padding: 6px 12px; border-radius: 999px; background: #F7F1F8; color: #481C5F; border: 1px solid #D6C9DC`
   - `              <span> font-size: 11px; font-weight: 700; letter-spacing: 0.18em; padding: 5px 11px; border-radius: 999px; color: #815E18; border: 1px solid #815E18`
5. **<footer>**
   - block: `position: relative; z-index: 1; padding: 56px clamp(16px, 5vw, 96px) 56px; border-top: 1px solid #E5D7EA`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px`
   - `    <div> flex: 1 1 420px; display: flex; flex-direction: column; gap: 16px; max-width: 560px`
   - `    <div> display: flex; flex-direction: column; gap: 12px`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #43143B`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #002B67`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #6A010E`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #003728`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #883500`

## Case study

Source `artboards/CaseStudy.dc.html` · screenshot `shots/CaseStudy-1440.jpg`

1. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 10px 10px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`
2. **<header>** : h1: Getting 60% of a global company to show up live
   - block: `padding: 0 clamp(16px, 5vw, 96px) clamp(40px, 4vw, 64px)`
   - `<div> max-width: 1280px; margin: 0 auto; padding-top: clamp(48px, 6vw, 96px); display: flex; flex-direction: column; gap: 24px`
   - `      <span> display: inline-block; width: 9px; height: 9px; border-radius: 999px; background: #43143B; margin-right: 8px`
   - `    <span> font-size: 11px; font-weight: 700; letter-spacing: 0.18em; padding: 6px 12px; border-radius: 999px; background: #E6C24C; color: #26142E`
   - `  <h1> margin: 0; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: clamp(42px, 5.8vw, 88px); line-height: 0.95; letter-spacing: -0.025em; color: #481C5F; max-width: 1080px`
   - `  <p> margin: 0; max-width: 700px; font-size: 19px; line-height: 1.65; color: #5C4965`
   - `  <dl> margin: 16px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px`
   - `    <div> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 20px; padding: 20px 22px; display: flex; flex-direction: column; gap: 6px`
   - `    <div> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 20px; padding: 20px 22px; display: flex; flex-direction: column; gap: 6px`
3. **<section>** : h2: The vampire moment · h2: Constraints
   - block: `padding: clamp(56px, 7vw, 112px) clamp(16px, 5vw, 96px)`
   - `<div> max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 220px minmax(0, 760px); gap: clamp(40px, 5vw, 72px); align-items: start`
   - `  <aside> position: sticky; top: 120px; display: flex; flex-direction: column; gap: 14px; font-size: 14px; line-height: 1.4; padding: 4px 28px 4px 0; border-right: 1.5px solid #CDBBD6`
   - `  <article> min-width: 0; max-width: 760px; display: flex; flex-direction: column; gap: 56px`
   - `    <div> display: flex; flex-direction: column; gap: 16px`
   - `      <p> margin: 0; padding: 16px 20px; border: 1.5px dashed #B8912B; border-radius: 16px; background: #FBF5DC; font-size: 15px; line-height: 1.6; color: #7A5C12`
   - `    <div> display: flex; flex-direction: column; gap: 16px`
   - `      <ul> margin: 0; padding-left: 20px; font-size: 17px; line-height: 1.75; color: #5C4965; display: flex; flex-direction: column; gap: 6px`
   - `      <p> margin: 0; padding: 16px 20px; border: 1.5px dashed #B8912B; border-radius: 16px; background: #FBF5DC; font-size: 15px; line-height: 1.6; color: #7A5C12`
4. **<section>** : h2: Want Town Halls people turn up to? Lift the lid first.
   - block: `padding: 0 clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px)`
   - `<div> max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px`
   - `  <a> display: flex; flex-direction: column; gap: 14px; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; padding: 36px; text-decoration: none; color: inherit`
   - `  <div> display: flex; flex-direction: column; justify-content: space-between; gap: 24px; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; padding: 36px`
   - `    <a> align-self: flex-start; display: inline-flex; align-items: center; height: 52px; padding: 0 28px; border-radius: 999px; background: #26142E; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none`
5. **<footer>**
   - block: `position: relative; z-index: 1; padding: 56px clamp(16px, 5vw, 96px) 56px; border-top: 1px solid #E5D7EA`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px`
   - `    <div> flex: 1 1 420px; display: flex; flex-direction: column; gap: 16px; max-width: 560px`
   - `    <div> display: flex; flex-direction: column; gap: 12px`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #43143B`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #002B67`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #6A010E`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #003728`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #883500`

## Blog index

Source `artboards/Blog.dc.html` · screenshot `shots/Blog-1440.jpg`

1. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 10px 10px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`
2. **<header>** : h1: Insights & Articles
   - block: `padding: clamp(56px, 7vw, 112px) clamp(16px, 5vw, 96px) 40px`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 32px; justify-content: space-between; align-items: flex-end`
   - `  <div> flex: 1 1 640px; display: flex; flex-direction: column; gap: 20px`
   - `    <p> margin: 0; max-width: 720px; font-size: 19px; line-height: 1.7; color: #5C4965`
3. **<section>**
   - block: `padding: 0 clamp(16px, 5vw, 96px)`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 10px`
4. **<section>** : h2: {{lead.title}}
   - block: `padding: 32px clamp(16px, 5vw, 96px) 0`
   - `<div> max-width: 1280px; margin: 0 auto`
   - `  <a> display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); overflow: hidden; text-decoration: none; color: inherit; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-r`
   - `    <div> grid-column: span 5; padding: 40px; display: flex; flex-direction: column; gap: 16px; justify-content: center`
5. **<section>** : h3: {{post.title}}
   - block: `padding: 32px clamp(16px, 5vw, 96px) 0`
   - `<div> max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px`
   - `    <a> display: flex; flex-direction: column; overflow: hidden; text-decoration: none; color: inherit; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: `
   - `      <div> padding: 24px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1`
6. **<section>** : h2: Get the next one in your inbox.
   - block: `padding: clamp(64px, 7vw, 112px) clamp(16px, 3vw, 48px) 0`
   - `<div> max-width: 1280px; margin: 0 auto; border-radius: 32px; background: #2A0E33; padding: clamp(40px, 5vw, 72px); display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: space-between`
   - `  <div> flex: 1 1 480px; display: flex; flex-direction: column; gap: 12px`
   - `      <input> flex: 1; height: 56px; padding: 0 20px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.08); color: #FFFFFF; font-family: Inter, sans-serif; font-size: 15px`
   - `    <button> height: 56px; padding: 0 28px; border: 0; border-radius: 999px; background: #E5C54F; color: #26142E; font-family: Inter, sans-serif; font-weight: 700; font-size: 16px; cursor: pointer`
7. **<footer>**
   - block: `position: relative; z-index: 1; padding: 56px clamp(16px, 5vw, 96px) 56px; border-top: 1px solid #E5D7EA`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px`
   - `    <div> flex: 1 1 420px; display: flex; flex-direction: column; gap: 16px; max-width: 560px`
   - `    <div> display: flex; flex-direction: column; gap: 12px`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #43143B`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #002B67`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #6A010E`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #003728`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #883500`

## Blog post

Source `artboards/BlogPost.dc.html` · screenshot `shots/BlogPost-1440.jpg`

1. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 10px 10px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`
2. **<header>** : h1: Who Signs Off When the Algorithm Sets the Pay?
   - block: `padding: clamp(48px, 6vw, 96px) clamp(16px, 5vw, 96px) 40px`
   - `<div> max-width: 920px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px`
   - `    <span> font-size: 11px; font-weight: 700; letter-spacing: 0.14em; padding: 6px 12px; border-radius: 999px; background: #4D1B5E; color: #FFFFFF`
   - `  <p> margin: 0; font-size: 21px; line-height: 1.6; color: #5C4965; max-width: 720px`
   - `    <img> width: 36px; height: 36px; border-radius: 999px; background: #FFFFFF; border: 1px solid #DED3E4; padding: 4px`
3. **<section>** : h2: Not sure where to start?
   - block: `padding: 0 clamp(16px, 3vw, 48px)`
   - `<div> max-width: 1280px; margin: 0 auto; border-radius: 32px; background: #2A0E33; padding: clamp(40px, 5vw, 72px); display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: space-between`
   - `  <div> flex: 1 1 520px; display: flex; flex-direction: column; gap: 14px`
   - `  <a> display: inline-flex; align-items: center; height: 56px; padding: 0 30px; border-radius: 999px; background: #E5C54F; color: #26142E; font-weight: 700; font-size: 16px; text-decoration: none`
4. **<section>** : h2: More on people, pay and AI · h3: Two-thirds of Dutch workers do not remove sensitive data before pasting it into an 
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `    <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px`
   - `    <a> display: flex; flex-direction: column; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,`
   - `      <div> padding: 24px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1`
   - `          <span> font-size: 11px; font-weight: 700; letter-spacing: 0.14em; padding: 6px 12px; border-radius: 999px; background: #4D1B5E; color: #FFFFFF`
   - `    <a> display: flex; flex-direction: column; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,`
   - `      <div> padding: 24px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1`
5. **<footer>**
   - block: `position: relative; z-index: 1; padding: 56px clamp(16px, 5vw, 96px) 56px; border-top: 1px solid #E5D7EA`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px`
   - `    <div> flex: 1 1 420px; display: flex; flex-direction: column; gap: 16px; max-width: 560px`
   - `    <div> display: flex; flex-direction: column; gap: 12px`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #43143B`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #002B67`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #6A010E`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #003728`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #883500`

## Privacy

Source `artboards/Privacy.dc.html` · screenshot `shots/Privacy-1440.jpg`

1. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 10px 10px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`
2. **<header>** : h1: Privacy Policy
   - block: `padding: clamp(56px, 7vw, 112px) clamp(16px, 5vw, 96px) 40px`
   - `<div> max-width: 820px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px`
3. **<section>**
   - block: `padding: 0 clamp(16px, 5vw, 96px) clamp(80px, 9vw, 140px)`
   - `<div> max-width: 820px; margin: 0 auto; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0`
4. **<footer>**
   - block: `position: relative; z-index: 1; padding: 56px clamp(16px, 5vw, 96px) 56px; border-top: 1px solid #E5D7EA`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px`
   - `    <div> flex: 1 1 420px; display: flex; flex-direction: column; gap: 16px; max-width: 560px`
   - `    <div> display: flex; flex-direction: column; gap: 12px`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #43143B`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #002B67`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #6A010E`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #003728`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #883500`

## Service page template (Internal Communications; the other five are identical apart from pillar colour and photos)

Source `artboards/ServiceIC.dc.html` · screenshot `shots/ServiceIC-1440.jpg`

1. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 10px 10px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`
2. **<section>** : h1: Internal communications consulting
   - block: `display: flex; flex-wrap: wrap; align-items: stretch; padding-top: clamp(40px, 5vw, 72px)`
   - `<div> flex: 999 1 560px; min-width: 0; padding: clamp(32px, 5vw, 80px) clamp(16px, 5vw, 64px) clamp(48px, 6vw, 96px) clamp(16px, 5vw, 96px); display: flex; flex-direction: column; justify-content: center; gap: 28px`
   - `      <span> flex: none; width: 12px; height: 12px; border-radius: 999px; background: #43143B`
   - `  <p> margin: 0; font-size: 18px; line-height: 1.7; color: #5C4965; max-width: 600px;`
   - `    <a> display: inline-flex; align-items: center; height: 52px; padding: 0 28px; border-radius: 999px; background: #26142E; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none`
   - `  <img> position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 28px 0 0 28px`
   - `  <div> position: absolute; left: -28px; bottom: 40px; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px `
3. **<section>**
   - block: `padding: 0 clamp(16px, 5vw, 96px) clamp(24px, 3vw, 40px)`
   - `<div> max-width: 1280px; margin: 0 auto`
   - `  <div> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: clamp(24px, 3vw, `
   - `    <div> grid-column: span 10; display: flex; flex-direction: column; gap: 12px`
4. **<section>** : h2: Built for the scale-up that has outgrown ad hoc updates and is still waiting on its first comms hire.
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(48px, 5vw, 80px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; displ`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; displ`
   - `    <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; displ`
5. **<section>** : h2: A message that survives the trip from
   - block: `padding: clamp(24px, 3vw, 48px) clamp(16px, 3vw, 48px)`
   - `<div> border-radius: 32px; background: #43143B; padding: clamp(48px, 6vw, 96px) clamp(24px, 5vw, 80px); display: flex; flex-wrap: wrap; gap: 48px; align-items: flex-end`
   - `  <div> flex: 1 1 520px; display: flex; flex-direction: column; gap: 20px`
6. **<section>** : h2: Here's the problem, and here's the fix. · h3: A background built for this exact problem
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(40px, 4vw, 64px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: flex; flex-direction: column; gap: 24px`
   - `    <article> background: #2A0E33; border-radius: 28px; padding: clamp(32px, 4vw, 52px); display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 32px; color: #FBF7EC`
   - `    <div> display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; align-items: stretch`
   - `      <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; dis`
   - `        <span> width: 36px; height: 4px; border-radius: 4px; background: #43143B`
   - `      <article> background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding: 30px; dis`
7. **<section>** : h2: What we can help with · h3: The Autopsy
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(40px, 4vw, 64px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; align-items: stretch`
   - `    <article> position: relative; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); `
   - `        <span> font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; padding: 6px 12px; border-radius: 999px; background: rgba(250,236,192,0.85); color: #26142E`
   - `      <div> display: flex; flex-direction: column; gap: 4px`
   - `      <div> display: flex; flex-direction: column; gap: 2px; padding: 14px 0; border-top: 1px solid #E5D7EA; border-bottom: 1px solid #E5D7EA`
   - `      <div> border-radius: 14px; background: rgba(250,236,192,0.55); padding: 14px 16px; font-size: 14px; line-height: 1.6; color: #26142E`
8. **<section>** #work : h2: Work in this area · h3: Getting 60% of a global company to show up live
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(40px, 4vw, 64px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `    <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px`
   - `    <a> display: flex; flex-direction: column; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,`
   - `      <div> padding: 26px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1`
   - `          <span> font-size: 11px; font-weight: 700; letter-spacing: 0.18em; padding: 6px 12px; border-radius: 999px; background: #E6C24C; color: #26142E`
   - `            <span> width: 9px; height: 9px; border-radius: 999px; background: #43143B`
   - `    <a> display: flex; flex-direction: column; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,`
9. **<section>** : h2: Frequently asked questions · h3: Will this replace our need for a comms hire eventually?
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) clamp(40px, 4vw, 64px);`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `  <div> display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 40px`
   - `    <div> grid-column: span 4; display: flex; flex-direction: column; gap: 18px`
   - `          <span> flex: none; width: 34px; height: 34px; border-radius: 999px; border: 1px solid #D6C9DC; display: flex; align-items: center; justify-content: center; color: #481C5F; font-size: 18px`
   - `          <p> margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #5C4965; max-width: 720px`
   - `          <p> margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #5C4965; max-width: 720px`
   - `          <p> margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #5C4965; max-width: 720px`
   - `          <span> flex: none; width: 34px; height: 34px; border-radius: 999px; border: 1px solid #D6C9DC; display: flex; align-items: center; justify-content: center; color: #481C5F; font-size: 18px`
10. **<section>** : h2: From the blog · h3: Volkswagen to Cut 50,000 Jobs: Employees More Upset with Comms than Job Loss
   - block: `padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px) 0px;`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px`
   - `    <div> display: flex; flex-direction: column; gap: 16px; max-width: 760px`
   - `  <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px`
   - `    <a> display: flex; flex-direction: column; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,`
   - `      <div> padding: 24px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1`
   - `          <span> font-size: 11px; font-weight: 700; letter-spacing: 0.14em; padding: 6px 12px; border-radius: 999px; background: #43143B; color: #FFFFFF`
   - `    <a> display: flex; flex-direction: column; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,`
   - `      <div> padding: 24px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1`
11. **<section>** #contact : h2: Not sure where to start?
   - block: `position: relative; z-index: 1; padding: clamp(80px, 9vw, 140px) clamp(16px, 5vw, 96px)`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 56px; align-items: flex-start`
   - `  <div> flex: 1 1 440px; display: flex; flex-direction: column; gap: 20px`
   - `    <p> margin: 0; font-size: 18px; line-height: 1.7; color: #5C4965; max-width: 520px;`
   - `    <span> font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 15px; letter-spacing: 0.18em; color: #672786; border: 1.5px solid #672786; padding: 8px 14px; border-radius: 4px; transform: rotate(-6deg); align-self: flex-start; margin-top: 12px`
   - `  <form> flex: 1 1 420px; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba(38,20,46,0.25); padding:`
   - `    <label> display: flex; flex-direction: column; gap: 8px; font-size: 14px; font-weight: 600; color: #26142E`
   - `      <input> height: 52px; padding: 0 18px; border-radius: 14px; border: 1px solid #D6C9DC; background: #FFFFFF; font-family: 'Inter', sans-serif; font-size: 15px; color: #26142E`
   - `    <label> display: flex; flex-direction: column; gap: 8px; font-size: 14px; font-weight: 600; color: #26142E`
12. **<footer>**
   - block: `position: relative; z-index: 1; padding: 56px clamp(16px, 5vw, 96px) 56px; border-top: 1px solid #E5D7EA`
   - `<div> max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px`
   - `    <div> flex: 1 1 420px; display: flex; flex-direction: column; gap: 16px; max-width: 560px`
   - `    <div> display: flex; flex-direction: column; gap: 12px`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #43143B`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #002B67`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #6A010E`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #003728`
   - `        <span> width: 10px; height: 10px; border-radius: 999px; background: #883500`

## Navbar states

Source `artboards/NavStates.dc.html` · screenshot `shots/NavStates-1440.jpg`

1. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 10px 10px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.8); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`
2. **<nav>**
   - block: `max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 6px 8px 6px 24px; border-radius: 2.1rem; background: rgba(255,255,255,0.97); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid #DED3E4; box-shadow: 0 1px 2px`
   - `<a> display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; background: #2A0E33; color: #FBF7EC; font-weight: 600; font-size: 15px; text-decoration: none`

## Admin: Work items list

Source `artboards/AdminWork.dc.html` · screenshot `shots/AdminWork-1440.jpg`

1. **<aside>**
   - block: `flex: none; width: 232px; background: #FFFFFF; border-right: 1px solid #E5D7EA; padding: 22px 14px; display: flex; flex-direction: column; gap: 4px`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; background: #F6F2F7; color: #4D1B5E; font-weight: 700`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #4D1B5E`
2. **<header>** : h1: Work
   - block: `display: flex; align-items: center; gap: 18px; padding: 16px 28px; background: #FFFFFF; border-bottom: 1px solid #E5D7EA`
   - `  <span> padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; background: #4D1B5E; color: #FFF`
   - `  <span> padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; color: #5C4965`
   - `<span> display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; background: #4D1B5E; color: #FFF; font-size: 13px; font-weight: 600`
   - `<span> display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px; border-radius: 999px; border: 1px solid #D6C9DC; color: #481C5F; font-size: 13px; font-weight: 600; background: #FFF`
   - `<span> width: 28px; height: 28px; border-radius: 999px; background: #26142E; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700`
3. **<main>**
   - block: `padding: 28px`
   - `<div> display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: start`
   - `  <div> background: #FFFFFF; border-radius: 18px; border: 1px solid #E5D7EA; overflow: hidden`
   - `      <span> flex: 1; display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: #F6F2F7; color: #8A7A92; font-size: 13px`
   - `      <span> display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; background: #F6F2F7; color: #481C5F; font-size: 11px; font-weight: 700; letter-spacing: 0.06em`
   - `      <span> display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; background: #F6F2F7; color: #481C5F; font-size: 11px; font-weight: 700; letter-spacing: 0.06em`
   - `      <span> display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; background: #F6F2F7; color: #481C5F; font-size: 11px; font-weight: 700; letter-spacing: 0.06em`
   - `    <div> display: grid; grid-template-columns: 28px 52px 2.6fr 110px 1.4fr 1.6fr 96px 70px; gap: 14px; padding: 10px 16px; background: #F6F2F7; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: #8A7A92`
   - `    <div> display: grid; grid-template-columns: 28px 52px 2.6fr 110px 1.4fr 1.6fr 96px 70px; gap: 14px; align-items: center; padding: 12px 16px; border-top: 1px solid #E5D7EA; font-size: 13px`

## Admin: Work item editor

Source `artboards/AdminWorkEdit.dc.html` · screenshot `shots/AdminWorkEdit-1440.jpg`

1. **<aside>**
   - block: `flex: none; width: 232px; background: #FFFFFF; border-right: 1px solid #E5D7EA; padding: 22px 14px; display: flex; flex-direction: column; gap: 4px`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; background: #F6F2F7; color: #4D1B5E; font-weight: 700`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #4D1B5E`
2. **<header>** : h1: Work
   - block: `display: flex; align-items: center; gap: 18px; padding: 16px 28px; background: #FFFFFF; border-bottom: 1px solid #E5D7EA`
   - `  <span> padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; background: #4D1B5E; color: #FFF`
   - `  <span> padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; color: #5C4965`
   - `<span> display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px; border-radius: 999px; border: 1px solid #D6C9DC; color: #481C5F; font-size: 13px; font-weight: 600; background: #FFF`
   - `<span> width: 28px; height: 28px; border-radius: 999px; background: #26142E; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700`
3. **<main>** : h3: Getting 60% of a global company to show up live
   - block: `padding: 28px`
   - `  <span> display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px; border-radius: 999px; border: 1px solid #D6C9DC; color: #481C5F; font-size: 13px; font-weight: 600; background: #FFF`
   - `  <span> display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; background: #4D1B5E; color: #FFF; font-size: 13px; font-weight: 600`
   - `<div> display: grid; grid-template-columns: 1fr 420px; gap: 24px; align-items: start`
   - `  <div> display: flex; flex-direction: column; gap: 18px`
   - `    <div> background: #FFFFFF; border-radius: 18px; border: 1px solid #E5D7EA; padding: 22px; display: flex; flex-direction: column; gap: 18px`
   - `      <div> display: flex; flex-direction: column; gap: 8px`
   - `        <span> display: inline-flex; padding: 3px; border-radius: 999px; background: #F6F2F7`
   - `          <span> padding: 6px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; background: #FFF; color: #4D1B5E; box-shadow: 0 1px 3px rgba(0,0,0,0.08)`

## Admin: Proof points

Source `artboards/AdminProof.dc.html` · screenshot `shots/AdminProof-1440.jpg`

1. **<aside>**
   - block: `flex: none; width: 232px; background: #FFFFFF; border-right: 1px solid #E5D7EA; padding: 22px 14px; display: flex; flex-direction: column; gap: 4px`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; background: #F6F2F7; color: #4D1B5E; font-weight: 700`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #4D1B5E`
2. **<header>** : h1: Work
   - block: `display: flex; align-items: center; gap: 18px; padding: 16px 28px; background: #FFFFFF; border-bottom: 1px solid #E5D7EA`
   - `  <span> padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; color: #5C4965`
   - `  <span> padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; background: #4D1B5E; color: #FFF`
   - `<span> display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; background: #4D1B5E; color: #FFF; font-size: 13px; font-weight: 600`
   - `<span> display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px; border-radius: 999px; border: 1px solid #D6C9DC; color: #481C5F; font-size: 13px; font-weight: 600; background: #FFF`
   - `<span> width: 28px; height: 28px; border-radius: 999px; background: #26142E; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700`
3. **<main>**
   - block: `padding: 28px`
   - `<div> display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start`
   - `  <div> background: #FFFFFF; border-radius: 18px; border: 1px solid #E5D7EA; overflow: hidden`
   - `    <div> display: grid; grid-template-columns: 28px 120px 2.2fr 1.6fr 2.4fr 80px; gap: 16px; padding: 10px 18px; background: #F6F2F7; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: #8A7A92`
   - `    <div> display: grid; grid-template-columns: 28px 120px 2.2fr 1.6fr 2.4fr 80px; gap: 16px; align-items: center; padding: 14px 18px; border-top: 1px solid #E5D7EA; font-size: 13px`
   - `        <span> position: relative; display: inline-block; width: 36px; height: 20px; border-radius: 999px; background: #4D1B5E`
   - `          <span> position: absolute; top: 2px; left: 18px; width: 16px; height: 16px; border-radius: 999px; background: #FFF`
   - `    <div> display: grid; grid-template-columns: 28px 120px 2.2fr 1.6fr 2.4fr 80px; gap: 16px; align-items: center; padding: 14px 18px; border-top: 1px solid #E5D7EA; font-size: 13px`
   - `        <span> position: relative; display: inline-block; width: 36px; height: 20px; border-radius: 999px; background: #4D1B5E`

## Admin: Work teaser panel

Source `artboards/AdminTeaser.dc.html` · screenshot `shots/AdminTeaser-1440.jpg`

1. **<aside>**
   - block: `flex: none; width: 232px; background: #FFFFFF; border-right: 1px solid #E5D7EA; padding: 22px 14px; display: flex; flex-direction: column; gap: 4px`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; background: #F6F2F7; color: #4D1B5E; font-weight: 700`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #4D1B5E`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
   - `<div> display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 14px; color: #5C4965`
   - `  <span> width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #B9A9C2`
2. **<header>** : h1: Pages · builder
   - block: `display: flex; align-items: center; gap: 18px; padding: 16px 28px; background: #FFFFFF; border-bottom: 1px solid #E5D7EA`
   - `<span> display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px; border-radius: 999px; border: 1px solid #D6C9DC; color: #481C5F; font-size: 13px; font-weight: 600; background: #FFF`
   - `<span> width: 28px; height: 28px; border-radius: 999px; background: #26142E; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700`
3. **<main>** : h3: Getting 60% of a global company to show up live · h3: A newsroom people opened every week
   - block: `padding: 28px`
   - `  <div> flex: 1; min-width: 0; padding: 28px; display: flex; flex-direction: column; gap: 18px`
   - `      <span> display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px; border-radius: 999px; border: 1px solid #D6C9DC; color: #481C5F; font-size: 13px; font-weight: 600; background: #FFF`
   - `      <span> display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; background: #4D1B5E; color: #FFF; font-size: 13px; font-weight: 600`
   - `    <div> border-radius: 22px; border: 2px solid #4D1B5E; background: linear-gradient(140deg, #F2E4F5, #FBF1D6); padding: 28px; display: flex; flex-direction: column; gap: 18px; position: relative`
   - `      <span> position: absolute; top: -12px; left: 18px; padding: 3px 10px; border-radius: 999px; background: #4D1B5E; color: #FFF; font-size: 11px; font-weight: 700`
   - `      <div> display: flex; flex-direction: column; gap: 8px`
   - `      <div> display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; align-items: start`
   - `        <a> display: flex; flex-direction: column; background: rgba(255,255,255,0.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(214,201,220,0.9); border-radius: 24px; box-shadow: 0 1px 2px rgba(38,20,46,0.05), 0 18px 40px -24px rgba`
