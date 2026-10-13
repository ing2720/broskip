import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';

const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
const files = {};
for (const name of (await readdir('dist')).sort()) {
  files[`netflix-supporter/extension/${name}`] = [new Uint8Array(await readFile(`dist/${name}`)), { mtime: new Date('2026-01-01T00:00:00Z') }];
}
const guide = `Netflix Supporter ${manifest.version}\n\n1. 이 ZIP을 압축 해제하세요.\n2. Chrome 주소창에 chrome://extensions 를 입력하세요.\n3. 개발자 모드를 켜고 '압축해제된 확장 프로그램을 로드합니다'를 누르세요.\n4. 이 폴더 안의 extension 폴더를 선택하세요.\n5. 열려 있는 Netflix 탭을 새로고침하세요.\n6. 퍼즐 아이콘에서 Netflix Supporter를 열면 종류별 ON/OFF를 바꿀 수 있어요.\n\n엔딩 뒤 추가 장면을 보려면 '다음 회차로'를 꺼주세요.\n\n자동 테스트·모의 화면 검증과 사용자 실사용 보고가 있는 버전입니다. 계정·회차별 검증 범위는 소스 저장소의 docs/VALIDATION.md를 확인하세요.\nNetflix가 제공하는 공식 제품이 아닙니다.\n\n소스: https://github.com/ing2720/netflix-supporter\n`;
files['netflix-supporter/시작하기.txt'] = [strToU8(guide), { mtime: new Date('2026-01-01T00:00:00Z') }];
const bytes = zipSync(files, { level: 9 });
const filename = `netflix-supporter-${manifest.version}.zip`;
await mkdir('artifacts', { recursive: true });
await writeFile(`artifacts/${filename}`, bytes);
await writeFile('artifacts/SHA256SUMS', `${createHash('sha256').update(bytes).digest('hex')}  ${filename}\n`);
console.log(`artifacts/${filename}: ${bytes.length} bytes`);
