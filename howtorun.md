### Первый терминал

1. cd backend
2. venv\Scripts\activate
3. python manage.py runserver 0.0.0.0:8000

### Второй терминал

1. cd backend
2. venv\Scripts\activate
3. daphne -b 0.0.0.0 -p 8001 daphne_startup:application

### Третий терминал

1. cd frontend
2. npm run dev

## Как коммитить

git add .
git commit -m "Комментарий"
git push -u origin main

## Внешний доступ через localtunnel

1. Откройте новый терминал
2. Для проброса бэкенда (API и WebSocket):
   npx localtunnel --port 8000
3. Для проброса фронтенда:
   npx localtunnel --port 3000
4. Дайте друзьям адреса, которые покажет localtunnel (например, https://cool-cat.loca.lt)
5. В браузере используйте эти адреса вместо localhost.