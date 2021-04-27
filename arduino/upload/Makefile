ARDCOREDIR = /home/stijn/.local/share/flatpak/app/cc.arduino.arduinoide/x86_64/stable/active/files/Arduino/hardware/arduino/avr/cores/arduino

CPP_SOURCE_FILES = out/input.cpp
# CPP_SOURCE_FILES += $(filter-out $(ARDCOREDIR)/main.cpp, $(wildcard $(ARDCOREDIR)/*.cpp))
CPP_SOURCE_FILES += $(wildcard $(ARDCOREDIR)/*.cpp)

CPP_SOURCE_FILES += $(wildcard /home/stijn/Documents/Arduino/libraries/FastLED-3.4.0/src/*.cpp)

build:
	mkdir -p out
	# echo "#include <Arduino.h>" > out/input.cpp
	# cat main.ino >> out/input.cpp
	cp main.ino out/input.cpp

	avr-g++ -std=c++17 -Os -Wall -ffunction-sections -fdata-sections -mmcu=atmega328p -DF_CPU=16000000 -DF_CPU=16000000L -DARDUINO=10813 -DARDUINO_AVR_UNO -DARDUINO_ARCH_AVR -I$(ARDCOREDIR)/../../variants/standard -I$(ARDCOREDIR) -include $(ARDCOREDIR)/Arduino.h -I/home/stijn/Documents/Arduino/libraries/FastLED-3.4.0/src/platforms/avr -I/home/stijn/Documents/Arduino/libraries/FastLED-3.4.0/src $(CPP_SOURCE_FILES) -o out/out.elf
	
	# avr-objcopy -O ihex -R .eeprom out/out.elf out/out.ihex
	echo done

upload: build
	avrdude -p atmega328p -c avrispmkii -b 19600 -P /dev/ttyUSB0 -U flash:w:TheExecutable.ihex:i out/out.ihex