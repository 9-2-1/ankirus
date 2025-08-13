docker run -it --rm \
	--net=host \
	-v ~/ankiserver:/anki \
	-v .:/ankirus \
	--name ankirus \
	--workdir /ankirus \
	anki \
	python3 main.py
