#!/usr/bin/env bash
set -e

# ============================================================================
#  OpenEgiz Digital Mine Contest Submission Assistant
#  Team-018: Smart-Kenish 4.0
# ============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${BOLD}${BLUE}========================================================================${NC}"
echo -e "${BOLD}${BLUE}       OPENEGIZ CONTEST SUBMISSION ASSISTANT (TEAM-018)${NC}"
echo -e "${BOLD}${BLUE}========================================================================${NC}\n"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BOLD}[1/4] Проверка обязательных файлов регламента (Правило 6.5)...${NC}"
MANDATORY_FILES=("README.md" "SUBMISSION.md" "presentation.pdf" "LICENSE")
ALL_FILES_OK=true

for f in "${MANDATORY_FILES[@]}"; do
  if [ -s "$f" ]; then
    echo -e "  ${GREEN}✔ Файл существует и не пуст:${NC} $f"
  else
    echo -e "  ${RED}✘ ОШИБКА: Обязательный файл отсутствует или пуст:${NC} $f"
    ALL_FILES_OK=false
  fi
done

if [ "$ALL_FILES_OK" = false ]; then
  echo -e "\n${RED}Исправьте недостающие файлы перед отправкой!${NC}"
  exit 1
fi

echo -e "\n${BOLD}[2/4] Запуск официального аудита Жинаушы...${NC}"
bash scripts/zhinaushy-verify.sh

echo -e "\n${BOLD}[3/4] Проверка статуса Git и последнего коммита...${NC}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "  ${YELLOW}Внимание: Текущая ветка '$CURRENT_BRANCH'. Переключаемся на 'main'...${NC}"
  git checkout main
fi

LAST_COMMIT_HASH=$(git rev-parse --short HEAD)
LAST_COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
echo -e "  ${GREEN}Ветка:${NC} main"
echo -e "  ${GREEN}Хеш коммита к отправке:${NC} ${BOLD}$LAST_COMMIT_HASH${NC}"
echo -e "  ${GREEN}Сообщение:${NC} $LAST_COMMIT_MSG"

echo -e "\n${BOLD}[4/4] Настройка удаленного репозитория GitHub...${NC}"
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$CURRENT_REMOTE" ]; then
  echo -e "  Удаленный репозиторий 'origin' еще не задан."
  echo -e "  Введите URL вашего репозитория команды на GitHub"
  echo -e "  (обычно: ${BOLD}https://github.com/openegiz-contest/team-018.git${NC}):"
  read -r -p "  URL репозитория: " USER_REMOTE
  
  if [ -z "$USER_REMOTE" ]; then
    USER_REMOTE="https://github.com/openegiz-contest/team-018.git"
    echo -e "  Используем по умолчанию: $USER_REMOTE"
  fi
  
  git remote add origin "$USER_REMOTE"
  CURRENT_REMOTE="$USER_REMOTE"
else
  echo -e "  Текущий удаленный репозиторий: ${BOLD}$CURRENT_REMOTE${NC}"
  read -r -p "  Использовать этот URL? [Y/n]: " KEEP_REMOTE
  if [[ "$KEEP_REMOTE" =~ ^[Nn]$ ]]; then
    read -r -p "  Введите новый URL репозитория: " NEW_REMOTE
    git remote set-url origin "$NEW_REMOTE"
    CURRENT_REMOTE="$NEW_REMOTE"
  fi
fi

echo -e "\n${YELLOW}------------------------------------------------------------------------${NC}"
echo -e "${YELLOW}ВАЖНО: При отправке через HTTPS GitHub запросит:${NC}"
echo -e "  1. Username (ваш логин на GitHub)"
echo -e "  2. Password (${BOLD}ваш Personal Access Token (PAT)${NC}, не пароль от аккаунта!)"
echo -e "  Если токена нет, создайте его: ${BLUE}https://github.com/settings/tokens${NC} (права: 'repo')"
echo -e "${YELLOW}------------------------------------------------------------------------${NC}\n"

read -r -p "Отправить ветку 'main' в $CURRENT_REMOTE сейчас? [y/N]: " CONFIRM_PUSH

if [[ "$CONFIRM_PUSH" =~ ^[YyДд]$ ]]; then
  echo -e "\n${BOLD}Выполняется: git push -u origin main...${NC}\n"
  git push -u origin main
  echo -e "\n${GREEN}${BOLD}========================================================================${NC}"
  echo -e "${GREEN}${BOLD}   ПОЗДРАВЛЯЕМ! ВАШЕ РЕШЕНИЕ УСПЕШНО ОТПРАВЛЕНО НА КОНКУРС!${NC}"
  echo -e "${GREEN}${BOLD}========================================================================${NC}"
  echo -e "\nПроверьте страницу репозитория: ${BLUE}$CURRENT_REMOTE${NC}"
  echo -e "Убедитесь, что зафиксированный коммит отображается в ветке 'main'.\n"
else
  echo -e "\n${YELLOW}Отправка отменена. Вы можете выполнить её вручную в любое время:${NC}"
  echo -e "  ${BOLD}git push -u origin main${NC}\n"
fi
