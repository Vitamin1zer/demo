# -*- coding: utf-8 -*-
"""Публикация демо для клиента: страница или папка проекта → <проект>/<страница>/ этого репозитория → GitHub Pages.

    python publish.py <источник> <проект> <страница> [--out ПАПКА] [--no-push] [--force]

источник  – HTML-файл или папка с index.html. Публикуются страница и только те файлы, на которые она ссылается (src, href,
            url() в CSS, по цепочке), – черновики, исходники шрифтов и прочее из папки не уходят;
проект    – имя папки проекта в Projects без направления: u-zubnogo, eco-capital;
страница  – короткий латинский адрес: karta-struktury.
Ссылка: https://vitamin1zer.github.io/demo/<проект>/<страница>/ (Pages собирает сайт около минуты после push).

Что делает:
- фрагмент без <!doctype> (так пишутся артефакты Claude) оборачивает в документ с кодировкой и viewport;
- в каждую HTML-страницу ставит <meta name="robots" content="noindex, nofollow"> – демо не должны попадать в поиск
  (копии клиентских страниц – это дубли);
- ищет в файлах доступы и ключи (пароли, токены, приватные ключи) и при находке не публикует; --force – только после
  ручной проверки, что это не доступ;
- папку <проект>/<страница>/ перезаписывает целиком: та же команда обновляет опубликованное по той же ссылке.
--out ПАПКА – собрать в указанную папку без git (проверить перед публикацией); --no-push – закоммитить, но не отправлять;
--swap СТАРЫЙ=НОВЫЙ – опубликовать другой файл под именем того, на который ссылается страница (например, публичные шрифты
вместо коммерческих: --swap fonts.css=fonts-inter.css); можно повторять.
"""
import argparse, os, re, shutil, subprocess, sys
from urllib.parse import unquote

HERE = os.path.dirname(os.path.abspath(__file__))
BASE_URL = 'https://vitamin1zer.github.io/demo/'
SLUG = re.compile(r'^[a-z0-9][a-z0-9-]*$')
ROBOTS = '<meta name="robots" content="noindex, nofollow">'
TEXT = {'.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.csv', '.md', '.xml'}
REF = re.compile(r'''\b(?:src|href)\s*=\s*["']([^"'#?]+)''', re.I)
CSS_URL = re.compile(r'''url\(\s*["']?([^"')#?]+)''', re.I)
SECRET = re.compile(r'(?i)(api[_-]?key\s*["\']?\s*[:=]|access[_-]?token\s*["\']?\s*[:=]|secret[_-]?key|passw(or)?d\s*["\']?\s*[:=]|'
                    r'пароль\s*[:=]|-----BEGIN [A-Z ]*PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20,}|\bsk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|'
                    r'DB_PASSWORD|AUTH_KEY)')
BAD_NAME = re.compile(r'(?i)(^\.env|wp-config|sftp\.json|id_rsa|ed25519|\.pem$|\.key$|\.kdbx$|token|passw|secret|credential|'
                      r'пароль|доступ|паспорт)')
BAD_DIR = re.compile(r'(?i)[\\/](\.secrets|_docs|\.git|\.ssh|\.claude)([\\/]|$)')
MAX_FILE = 25 * 1024 * 1024        # GitHub предупреждает с 50 МБ, Pages – сайт до 1 ГБ


def is_local(ref):
    return bool(ref) and not re.match(r'^(?:[a-z][a-z0-9+.-]*:|//|/)', ref, re.I)


def collect(src, swap=()):
    """Страница и всё, на что она локально ссылается: {файл-источник: путь в публикации}.
    swap – пары «старый=новый» относительно папки источника: под именем старого файла публикуется новый."""
    src = os.path.abspath(src)
    root, start = (src, os.path.join(src, 'index.html')) if os.path.isdir(src) else (os.path.dirname(src), src)
    if not os.path.isfile(start):
        sys.exit(f'нет страницы: {start}')
    if os.path.splitext(start)[1].lower() not in ('.html', '.htm'):
        sys.exit(f'источник – HTML-страница или папка с index.html, а не {os.path.basename(start)}')
    swaps = {}
    for pair in swap:
        old, _, new = pair.partition('=')
        old, new = (os.path.normpath(os.path.join(root, x.strip())) for x in (old, new))
        if not os.path.isfile(new):
            sys.exit(f'--swap: нет файла {new}')
        swaps[old] = new
    files, queue, missing, seen = {}, [start], [], set()
    while queue:
        path = queue.pop()
        if path in seen:
            continue
        seen.add(path)
        rel = 'index.html' if path == start else os.path.relpath(path, root).replace(os.sep, '/')
        body = swaps.pop(path, path)
        if rel.startswith('..') or os.path.relpath(body, root).startswith('..'):
            sys.exit(f'страница ссылается на файл вне папки источника: {path}')
        if any(BAD_NAME.search(os.path.basename(x)) or BAD_DIR.search(x) for x in (path, body)):
            sys.exit(f'файл похож на доступы, публиковать нельзя: {body}')
        files[body] = rel
        ext = os.path.splitext(path)[1].lower()
        if ext in ('.html', '.htm', '.css'):
            text = open(body, encoding='utf-8', errors='replace').read()
            refs = (REF.findall(text) if ext != '.css' else []) + CSS_URL.findall(text)
            for r in refs:
                r = unquote(r.strip())
                if not is_local(r) or '${' in r or '{{' in r:     # подстановки шаблонов в скриптах – не файлы
                    continue
                p = os.path.normpath(os.path.join(os.path.dirname(path), r))
                if os.path.isfile(p):
                    queue.append(p)
                elif os.path.isdir(p) and os.path.isfile(os.path.join(p, 'index.html')):
                    queue.append(os.path.join(p, 'index.html'))
                else:
                    missing.append(f'{os.path.basename(path)} → {r}')
    if swaps:
        sys.exit('--swap: страница не ссылается на ' + ', '.join(os.path.relpath(x, root) for x in swaps))
    return files, missing


def prepare_html(text):
    """Документ целиком и закрытый от индексации."""
    text = re.sub(r'<meta[^>]+name=["\']robots["\'][^>]*>\s*', '', text, flags=re.I)
    if not re.search(r'<!doctype', text[:1000], re.I):
        return ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1">\n' + ROBOTS + '\n' + text.lstrip('﻿') + '\n</html>\n')
    if re.search(r'<head[^>]*>', text, re.I):
        return re.sub(r'(<head[^>]*>)', lambda m: m.group(1) + '\n' + ROBOTS, text, count=1, flags=re.I)
    return re.sub(r'(<html[^>]*>)', lambda m: m.group(1) + '\n<head>' + ROBOTS + '</head>', text, count=1, flags=re.I)


def scan(files):
    hits = []
    for path in files:
        if os.path.getsize(path) > MAX_FILE:
            sys.exit(f'файл больше {MAX_FILE // 2 ** 20} МБ: {path}')
        if os.path.splitext(path)[1].lower() not in TEXT:
            continue
        for i, line in enumerate(open(path, encoding='utf-8', errors='replace'), 1):
            m = SECRET.search(line)
            if m:
                hits.append(f'{os.path.basename(path)}:{i}: …{line[max(0, m.start() - 30):m.end() + 10].strip()}…')
    return hits


def git(*args):
    r = subprocess.run(['git', '-C', HERE, *args], capture_output=True, text=True, encoding='utf-8')
    if r.returncode:
        sys.exit(f'git {" ".join(args)}: {r.stderr.strip() or r.stdout.strip()}')
    return r.stdout.strip()


def main():
    ap = argparse.ArgumentParser(description='Демо для клиента → GitHub Pages')
    ap.add_argument('source')
    ap.add_argument('project')
    ap.add_argument('page')
    ap.add_argument('--out', help='собрать в эту папку без git')
    ap.add_argument('--no-push', action='store_true')
    ap.add_argument('--force', action='store_true', help='публиковать, несмотря на находки проверки доступов')
    ap.add_argument('--swap', action='append', default=[], metavar='СТАРЫЙ=НОВЫЙ',
                    help='опубликовать файл НОВЫЙ под именем СТАРЫЙ (пути от папки источника), например fonts.css=fonts-inter.css')
    a = ap.parse_args()
    for v in (a.project, a.page):
        if not SLUG.match(v):
            sys.exit(f'«{v}»: только латиница в нижнем регистре, цифры и дефис')

    files, missing = collect(a.source, a.swap)
    hits = scan(files)
    if hits and not a.force:
        sys.exit('похоже на доступы или ключи – не публикую (проверь и при ложной тревоге повтори с --force):\n  ' + '\n  '.join(hits))
    dest = os.path.abspath(a.out) if a.out else os.path.join(HERE, a.project, a.page)
    if os.path.exists(dest):
        shutil.rmtree(dest)
    for path, rel in files.items():
        out = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if os.path.splitext(path)[1].lower() in ('.html', '.htm'):
            open(out, 'w', encoding='utf-8', newline='\n').write(prepare_html(open(path, encoding='utf-8-sig').read()))
        else:
            shutil.copyfile(path, out)
    size = sum(os.path.getsize(p) for p in files)
    print(f'файлов: {len(files)}, {size / 2 ** 20:.1f} МБ → {dest}')
    for m in missing:
        print('  нет файла по ссылке:', m)
    if a.out:
        return

    url = f'{BASE_URL}{a.project}/{a.page}/'
    git('add', '-A', '--', f'{a.project}/{a.page}')
    if not git('status', '--porcelain', '--', f'{a.project}/{a.page}'):
        print('изменений нет, ссылка та же:', url)
        return
    git('commit', '-q', '-m', f'Демо: {a.project}/{a.page}')
    if not a.no_push:
        git('push', '-q')
    print('ссылка:', url, '(Pages обновится примерно через минуту)')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
