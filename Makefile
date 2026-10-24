.PHONY: all verify smoke up down team-mine example-mine ps logs clean

all: verify

verify:
	@$(MAKE) -C team-018-main verify

%:
	@$(MAKE) -C team-018-main $@
