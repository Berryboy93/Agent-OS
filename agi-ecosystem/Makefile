# AGI Ecosystem Makefile
.PHONY: build test dev docker-up docker-down k8s-deploy clean

build:
	pnpm build

test:
	pnpm test

dev:
	pnpm dev

docker-up:
	docker-compose up -d --build

docker-down:
	docker-compose down -v

k8s-deploy:
	kubectl apply -f infra/k8s/namespace.yaml
	kubectl apply -f infra/k8s/configmap.yaml
	kubectl apply -f infra/k8s/secrets.yaml
	kubectl apply -f infra/k8s/

db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed

clean:
	find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +
	find . -name 'dist' -type d -prune -exec rm -rf '{}' +
	find . -name '.tsbuildinfo' -type f -delete

security-scan:
	pnpm security:scan
