#ifndef F_CPU
#define F_CPU 16000000
#endif

#include <avr/io.h>     //defines pins, ports etc
#include <util/delay.h> //functions for wasting time

int main(void)
{
    //init
    DDRB |= (1 << PB5); //Data Direction Register B:
                        //writing a 1 to the Pin B5 bit enables output
                        //Event loop
    while (1)
    {
        PORTB = 0b00100000; //turn on 5th LED bit/pin in PORT B (Pin13 in Arduino)
        _delay_ms(1000);    //wait

        PORTB = 0b00000000; //turn off all bits/pins on PB
        _delay_ms(1000);    //wait
    }                       //end loop
    return (0);             //end program. This never happens.
}