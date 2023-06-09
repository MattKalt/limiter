// Complex IIOR

// Uses THE MOTHERLODE, a collection of effects you can use on _ANY_ variable that changes. This tool was made by Graserpirate.

// This song is a remix of inside castle, by Rio Zack.

// A collection of effects you can use on _ANY_ variable that changes


//Original t, increments one per sample. The reverb, harmonifier, hihat, and snare need this.
T = t,

//Change t here, not below, or it messes with the snare/hihat sounds
t *= 80 / 480,

// Repeat x beats of y
// SUPER useful if you're writing complex beats/melodies
// Include this or the FXs won't work (or you could replace r(x, y) with Array(x).fill(y))
// r(1,[arrays]) also serves as a replacement for [arrays].flat()
r = repeat = (x, y) => Array( x ).fill( y ).flat( 9 ),

sp = (str, sep='') => str.split( sep ),
j = (arr, sep='') => arr.join( sep ),

//tra = transpose = (arr, amt) => arr.map(x=>x+amt),
tra = transpose = (x, amt) => Array.isArray(x)? x.map( e => e + amt ) : j( sp(x).map( e => e + amt ) ),

// Uses up a lot of chars and isn't /super/ readable, but a major timesaver when creating
// Particularly the NaN handing
m = mix = (x, vol=1, dist=0) => ( ( x * vol * ( 1 + dist ) ) % ( 256 * vol ) ) || 0,

// Waveshaper distortion
// Assumes range is neatly between 0-255; use after limiter
// Negarive values make it rounder (though after .6 there are wraparound artifacts)
ds = (x, amt) => m(x) * (1 - amt) + 127 * ( ( ( m(x) / 127 ) - 1 ) ** 3 + 1 ) * amt,


seq = ( arr, spd, t2=t ) => arr[ (t2 >> spd) % arr.length ],
mseq = ( ...x ) => t * 2 ** ( seq(...x) / 12 ), //original
//mseq = ( ...x ) => t * 2 ** ( ( seq(...x) + ((t/9>>17)&3) )  / 12 ), //Trucker's Chorus version


// The Breakbeat drum machine. This is where the magic happens
// It sequences through an array and plays the corresponding number of beats
//    (1 = quarter note, 2 = 2 8th notes, etc)
// Something interesting happens when you don't use powers of 2, however:
//    You get strange and wonderful sounds
// the variables 's' and 'h' make it sound like a snare and a hihat, respectively
// most sounds are different timbres of the same note
// but if you replace 'T' with something other than t, such as any bytebeat melody,
// you can apply that timbre to the melody.
// Adding / &ing a breakbeat with a melody can also add attack to the notes of the melody
bt = beat = (arr, spd, vel = 2e4, vol = 1, T = t, oct = 0) =>
	m(vel / (T & (2 ** (spd - oct) / seq( arr, spd ) ) - 1), vol),

ls = sin(T / 9 & T >> 5), // long snare
//s = sin(t>>5), // acoustic-sounding grungy snare
//s = (((t*8/48)>>9) & 1) ? 0 : sin(t / 9 & t >> 5), // Snare
s = seq( [ls, 0], 9), // Snare
S = seq( [ls, 0], 8), // double snare
//s = sin((t | t * .7) >> 4), // quieter snare
//h = 1 & t * 441/480, // long Hihat
h = 1 & T * 441/480, // long Hihat
h = seq( [h,h,h,0], 8), //quieter, faster attack



// The FX rack, stores memory for use in effects
// Automatically keeps track of what's stored where
// If you see red (NaNs), raise 5e4 higher, or adjust your reverbs' 'dsp' variable
// Works best when FX are not inside conditionals (meaning the number of FX in use changes)
// But even then, should only create a momentary click/pop (might be more severe for reverb)
// You can also set it to [] and modify the effects to read m(fx[stuff]) to get around NaN issues
//    ^(this gets rid of the lag when editing, but sparse arrays might be slower during runtime)
t ? 0 : fx = r( 4e4, 0 ),
// Iterator, resets to 0 at every t
fxi = 0,

//dsp = downsample the bitrate of the reverb, dsp=2 cuts uses half as much space, 3 uses 1/3, etc
rv = reverb = (x, len = 16e3, feedb = .7, dry = .4, wet = 1, dsp = 2, t2=T) => (
	ech = y => fxi + ( 0|(y % len) / dsp ),
	x = x*dry + wet*fx [ech(t2) ] || 0,
	T % dsp ? 0 : fx[ ech(T) ] = x * feedb,
	fxi += 0|(len / dsp),
	x
),


lp = lopass = (x, f) => ( // f ~= frequency, but not 1:1
	// fx[fxi] is the value of the last sample
	x = min( max( m(x), fx[fxi] - f), fx[fxi] + f), // Clamp the change since last sample between (-f, f)
	fx[fxi] = x,
	fxi++,
	x
),

// Sounds kinda off, and hipass+lopas=/=original when you use ^, but + sounds harsher
hp = hipass = (x, f) => m(x) ^ lp(x, f),

lim = limiter = ( input, speed = .1, lookahead = 64, wet = .9, thresh = 9, bias = 0, iters = 8, saturate = 0 ) => {
	l = x => fxi + 2 + ( T + x|0 ) % lookahead;
	fx[ l(0) ] = m(input);
	B = fx[ l(1) ]; //oldest in buffer
	d = [255,0];
	for( i=1; i < iters + 1; i++) {
		//d[0] = min( d[0], B, fx[ l( i * lookahead / iters) ] / i + B * ( 1 - 1/i) ); //harmonic 
		d[0] = min( d[0], B, fx[ l( i * lookahead / iters) ] * ( 1 - i / iters) + B * i / iters ); //linear
		d[1] = max( d[1], B, fx[ l( i * lookahead / iters) ] * ( 1 - i / iters) + B * i / iters ); //linear
	}
	mi = fx[ fxi ] = min( d[0], fx[ fxi ] + speed, 255 );
	mx = fx[ fxi+1 ] = max( d[1], fx[ fxi+1 ] - speed * ( bias + 1 ), mi + ( t ? thresh : 255 ) );
	fxi += 2 + lookahead;
	return ds( ( B - mi ) * 255/(mx-mi), saturate ) * wet + B * (1-wet)
},

//downsample
//dsp = downsample = (x, res) => (
//	x = fx[fxi] = T & res ? x : fx[fxi],
//	x
//),

// Multi-voice melody: 'voices' is like a list of resonances
//mvm = (melody, speed, voices) => (
//	vcp = voices,
//	vcp.reduce((sum, i) =>
//		sum + m(i * t * 1.05946 ** melody[(t >> speed) % melody.length], .9 / vcp.length), 0)
//),



// XORs the input with its harmonics, controlled by the bits of a number ('tone')
// Unoptimized version
hm = harmonify = (x,tone) => {
	o = 0;
	//for (i=0; i < log2(tone) + 1; i++) { //flexible size of 'tone'
	for (i=0; i<8; i++) {
		o ^= ( 1 & (tone>>i) ) * (i+1)/2 * x
	}
	return o;
},

chorus = (x, amt) => m(x*(1-amt))/3 + m(x)/3 + m(x*(1+amt))/3,

// Instead of computing on the fly, this version computes a wavetable at the start
// Side effects: output is always full-volume
hm3 = harmonify = (x, tone, waveTableSize = 4) => {
	waveTableSize *= 64 * T / t | 0;
	//play from the buffer
	if( fx[fxi] > waveTableSize ) {
		o = fx[ fxi + 1 + ( x * T / t & waveTableSize - 1) ];
		fxi += 1 + waveTableSize;
		return o
	}
	//fill the buffer
	for (i=0; i<8; i++) {
		w = ( bitpos ) => ( 1 & ( tone >> ( i + bitpos ) ) ) * (i+1)/2;
		t3 = fx[fxi] * t / T;
		fx[ fxi + 1 + fx[fxi] ] ^= ( w(0) * t3 ) ^ ( abs( m( w(8) * t3 ) - 128 ) * 2 )
	}
	fx[fxi]++;
	fxi += 1 + waveTableSize;
	//return x //not strictly necessary unless the wavetable size is large enough to notice silence at the start
},

//Basically just treat this like a black box and fiddle with the knobs at random
sy = synth = (melody, velTrack, speed, y, ...z)=>
(
	//Controls
	x = ( pos, bits ) => ( y / ( 2 ** pos ) & 2 ** bits - 1 ),

	q = x( 48, 8 ) / 64,							//- - - - hex 1 - 2: mystery 1 (fractional beats)
	g = x( 40, 8 ) * .02,						//- - - - hex 3 - 4: mystery 2 ('octave' beat param)
	o = x( 24, 16 ),								//- - - - hex 5 - 8: Harmonifier (5-6 tri, 7-8 saw)
	z = x( 20, 4 ) + 1, 							//- - - - hex 9 : wavetable size
	c = x( 16, 4 ),								//- - - - hex 10: chorus
	n = x( 14, 2 ),								//- - - - hex 11: sine octave ( /4, no sine if 0)
	w = x( 12, 2 ) / 4, 							//- - - - - - - - - - (last 4 bits: waveshaping)
	d = 9 * t / T * 2 ** x( 8, 4 ), 			//- - - - hex 12: resonance decay
	w += min(.5, beat( velTrack, speed, 1, d ) ),
	a = 8e4 * t / T * ( x( 4, 4 ) + 1 ), 	//- - - - hex 13: note decay (higher = longer)
	a2 = -.6 + x( 4, 4 ) ** 2 / 200,
	l = 2 + ((y%16) ** 2) / 2, 						//- - - - hex 14: lopass


	n && ( melody = sinify( melody * 1/16 * 2 ** n ) ),
	c && ( melody = chorus( melody, ( c - 1 ) / 640) ),
	melody = ds( melody, w ),
	lim(
		lp(
			min(
				m(
					hm3(
						beat( [ q ], 10, 6e4, 1, melody, g )
					, o, z,
					)
				, 1, 1
				)
			, beat( velTrack, speed, 1, a )
			)
		, l
		)
	, .003, 32, .7, 64, 2, 4, a2
	)
),

//saw 2 sine
s2s = sinify = x => sin( x*PI/64 ) * 126 + 128,

// ------------ARRAYS------------

// Chrome lags when these are defined at every t
// weirdly though this isn't the case for functions
//note: any arrays with s or h must be outside the t||()
t || (
melody=[2,4,5,9,2,4,5,9,2,4,5,9,12,9,7,5,0,2,4,7,0,2,4,7,0,2,4,7,0,2,4,0,-2,0,2,5,-2,0,2,5,-2,0,2,5,-2,0,2,-2,-3,-1,1,4,-3,-1,1,4,-3,-1,1,7,-3,-1,1,9]
),

rotate = ofs => sin((t * 2 ** -16) + ofs) + 2,

//  ------------SONG------------


rRrR=max(0,(T-48000)/(1<<16)),
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[1,.6],11,1,0x071033002FF),(z&143))*(1-t%8192/12E3),
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[1,.6],11,0x0278eFC770F8),(z&127))*(1-t%8192/12E3),
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[1,.6],11,0x02271FC770F8),(z&127))*(1-t%8192/12E3),
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[1,.6],11,0x02473FC30088),(z&127))*(1-t%8192/12E3),
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x02473FC30f88),(z&127))*(1-t%8192/12E3),
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x04173fc800F8),(z&127))*(1-t%8192/12E3),
C=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x04273fc800c8)), //weird
D=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x0427f4780038)), //extremely percussive
E=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x0437f4703068)), //super bass
F=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x0457f4706035)), //marimba-ish
G=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x0467f4706035)), //keys
H=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x0477f4005036),min(z,64)), //banjo
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x049707700037)), //low string
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x139737306037)), //hi string
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x139701506037)), //percussive string, octaved
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x139701500037)), //percussive string
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x13980d5000f7)), //super dist
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x13980df000a7)), //dist scratchy piano
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x13980211000089)), //really good piano
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x1398000d000089)), //almost-as-good piano
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x13980511000079)), //very clean piano
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[1,.5,.5],12,0x149805120000b7)), //synth
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x1b980300100079)), //very clean piano

//new:
//a=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x1b980513000079)), //very clean piano

//new:
//A=t=>(p=melody[(t>>13)%64],z=t*2**(p/12)*3.2,z=synth(z,[.5,1],13,0x1b9805165fc074)), //glockenspiel

//48k:

//8k:
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[.5,1],11,0x5b4e051650b384)), //glockenspiel
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[.5,1],11,0x0d04db0081036b)), //high chimes
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[.5,1],11,0x1337d00db00bbf)), //superhigh mouse harpsichord
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[.5,1],11,0x1337f00dd00dbf)), //superhigh mouse harpsichord
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=min(m(z)/2,synth(z,[1,.05],9, 0xdadababa420859))), //bizarre
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1,1/5,1/10,1/10],10,0x1337f00dd00d3f)), //superhigh mouse harpsichord
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x494a0103400496)), //whistle
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x493a010340c3e6)), //whistle 2
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x492a01171073e6)), //piano
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x492a01371046f6)), //kazoo + keyboard
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x492a01379048f6)), //
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4b2a01379048f5)), //soft understated
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4c2a01379048f6)), //soft understated 2
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4c2f01379048fb)), //soft understated 3
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4c2f063790766b)), //soft understated 4
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4c3a0637907f9b)), //ooo
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4c3a063790928d)), //squarey
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4c300637907046)), //computer marimba
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4c330637907876)), //accordion
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4c340637907f86)), //
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4c370637307f66)), //kazoo + keys 2
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x04c3e063790876)), //chorusey high organ
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x65a8d48d146628)), //thin percussive steelpan
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x34f641b2a153c8)), //good organ
//A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x7abe62ae515345)), //okish
//A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x3cef2036db84b6)), //okish, percussive
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x55a9dce86022f8)), //anemic hi glockenspiel
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0xab39e8b17ea748)), //okish computer percuss
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x4200c6f33b5be0)), //undertones galore
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x645f138592b738)), //okish hi staccato
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x6c6e8570e8f750)), //screamy, kinda sucks
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0xd1d02dd8726730)), //idk but it's acoustic and cool
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x7abe62ae515345)), //generic bell
A=t=>(p=melody[(t>>11)%64],z=t*2**(p/12)*32,z=synth(z,[1],11, 0x0aee7f27d371d6)), //clean toy square



//A(t)


b=(t,X=1)=>(p=melody[((t>>15)%4)*16],z=(t/(4/X))*2**(p/12)*32,zs=synth(z/4,[1],15,0x020700203380f3),min(48,zs)*1+s2s(z/8)/3)*(32-t%65536/48E3),


mel=lp(A(t)/3+A(t-12168)/5+A(t-24336)/6+A(t-36504)/12+A(t-48672)/32,rRrR),
bass=(b(t)+b(t-12168)/2+b(t-24336)/4+b(t-36504)/8+b(t-48672)/16)/48,

o = (mel-((t>>17)?bass:0))/2 + 96,

//s=x=>{for(i=0;i<32;i++){o=lim( o, 1e-4 * (i + 1) ** 2 , 1 + (2**(9-i)) )}},s(0),
//o = lim( o, 5e-3, 9 )

//o
ds( lim( o, .001, 64, .9, 1, .125, 16 ), -.6 )
//mel
//A(t)

//lim( ( rv(A(t),12e3)-((t>>17)?lim(lp(b(t)/9,99),9,123,64,9)/4:0))/4+64, .002, 123, 1, 1 )
 
//lim( A(t)/4 + lp(rv( A(t), 7e3, .95, .1, 1, 7 ), 4 ), .01, 1233, .9, 16, .5 )

//thresh = 2,

//[ log( max(A(t), thresh ) - 1 ) * thresh - log( thresh - 1 ) * thresh + min(A(t), thresh )
//, min(320,A(t)) ]

//ds(lim(lp(ds(lim(A(t), .1, 99),-.5), 9),1,99),-.5)/4 + 64
//(ds(lim(lp(A(t),2),.1,99)/2+128,-.5)-128)/2 + 64

//lim(lim(lim((mel+((t>>20)?bass:0))/4,5e-3,4),.5,2),.1,1.2)
//lim((mel+((t>>20)?bass:0))/4,5e-3,9)


ml = mseq( melody, 11 ),

//ml2 = abs( lp( ml, (1 * ml / t)||0 ) - 124 ) * 1.9, //triangle wave
//ml2 = lp( abs( m( ml ) - 128 ) * 2, 9), //triangle wave
ml2 = abs( m( ml ) - 128 ) * 2, //triangle wave
//ml2 = 255 - abs( m( ml ) - 128 ) * 2, //triangle wave
ml2a = 255 - ml2,
ml3 = ds( ml2, 1 ),

//[-1*t, ~t]

//tn = [10,0,128],
tn = [1, 0, 191],

ml4 = hm( ml, tn[0] ) ^ hm( ml%93, tn[1] ) ^ hm( ml2, tn[2] ),
//ml4 = hm( ml, tn[0] ) ^ hm( ml%93, tn[1] ) ^ (abs( m( hm( ml, tn[2] ) ) - 128) * 2),


//ml4
ds(sinify(ml),-.6)
//ds( ml, -.75 )
