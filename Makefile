ITCH_API_BASE ?= https://bird.devlabtech.com
ITCH_ZIP := vite/the-bird-game-itch.zip

.PHONY: itch
itch:
	cd vite && VITE_API_BASE='$(ITCH_API_BASE)' npm run build
	rm -f '$(ITCH_ZIP)'
	cd vite/dist && zip -r '../the-bird-game-itch.zip' . -x '*.DS_Store' -x '*/.DS_Store'
	@echo "Created $(ITCH_ZIP)"
