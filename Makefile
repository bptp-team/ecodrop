.PHONY: install prepare dev build lint format format-check test preview

install:
	npm install

prepare:
	npm run prepare

dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint

format:
	npm run format

format-check:
	npm run format:check

test:
	npm run test

preview:
	npm run preview
